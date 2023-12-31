import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class CheckBanGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {

        const ctx = GqlExecutionContext.create(context);
        const activeBan = ctx.getContext().req.user.ban;

        if (activeBan) {
            throw new UnauthorizedException("User account blocked!");
        }

        return true;
    }
}