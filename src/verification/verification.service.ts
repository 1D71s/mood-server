import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtPayloadUser } from "@src/auth/iterfaces";
import { PrismaService } from "@src/common/prisma/prisma";
import { MailService } from "@src/mail/mail.service";
import { UserEntity } from "@src/user/entity/user-entity";
import { AttemptService } from "@src/attempt/attempt.service";
import { AttemptType } from "@prisma/client";

@Injectable()
export class VerificationService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly mailService: MailService,
        private readonly attemptService: AttemptService
    ) {}

    async sendConfirmCode(user: JwtPayloadUser): Promise<boolean> {
        const findCode = await this.prismaService.emailConfirm.findFirst({
            where: { userId: user.id }
        })

        if (findCode && findCode.exp > new Date()) {
            throw new BadRequestException("Verification code expired");
        }

        await this.deleteConfirmationCodes(user.id);

        const generateCode = this.generateVerificationCode();
        await this.mailService.sendEmail(user.email, 'EMAIL VERIFICATION CODE', generateCode);

        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 1);

        await this.prismaService.emailConfirm.create({
            data: {
                code: generateCode,
                userId: user.id,
                exp: expirationDate
            }
        })

        return true
    }

    async confirmEmail(code: string, user: JwtPayloadUser, agent: string): Promise<UserEntity> {
        const attemptCheck = { userId: user.id, where: AttemptType.CODE, user_agent: agent };

        await this.attemptService.check(attemptCheck)

        const findCode = await this.prismaService.emailConfirm.findFirst({
            where: {
                code,
                userId: user.id
            }
        })

        if (!findCode || findCode.exp < new Date()) {
            throw new BadRequestException("Invalid or expired confirmation code");
        }

        await this.deleteConfirmationCodes(user.id);
        await this.attemptService.remove(attemptCheck)

        return this.prismaService.user.update({
            where: { id: user.id },
            data: { emailVerify: true }
        })
    }

    private async deleteConfirmationCodes(userId: string): Promise<void> {
        await this.prismaService.emailConfirm.deleteMany({ where: { userId } });
    }

    private generateVerificationCode(): string {
        return Array.from({ length: 6 }, () => Math.floor(Math.random() * 9) + 1).join("");
    }
}