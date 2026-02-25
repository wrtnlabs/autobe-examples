import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";
import { guestAuthorize } from "../providers/authorize/guestAuthorize";

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return guestAuthorize(request);
  })(),
);

export const GuestAuth = singleton.get();