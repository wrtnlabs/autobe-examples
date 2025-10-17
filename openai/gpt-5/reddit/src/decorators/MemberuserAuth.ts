// File path: src/decorators/MemberuserAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { memberuserAuthorize } from "../providers/authorize/memberuserAuthorize";

/**
 * Parameter decorator for authenticating Member users via Bearer token.
 * Usage: someMethod(@MemberuserAuth() user: MemberuserPayload) {}
 */
export const MemberuserAuth = (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    // Add Bearer security requirement to Swagger docs
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);

    // Register singleton decorator instance
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return memberuserAuthorize(request);
  })(),
);
