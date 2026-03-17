import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";
import { AdminPayload } from "../payload/AdminPayload";
import { adminAuthorize } from "../providers/authorize/adminAuthorize";

export function AdminAuth(): ParameterDecorator {
  return SwaggerCustomizer((props) => {
    props.route.security ??= [];
    props.route.security.push({ bearer: [] });
  })(
    Singleton.get(
      () =>
        createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
          const request = ctx.switchToHttp().getRequest();
          return adminAuthorize(request);
        })(),
    ) as ParameterDecorator
  );
}