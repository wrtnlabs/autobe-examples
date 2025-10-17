// File path: src/decorators/AdminuserAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { adminuserAuthorize } from "../providers/authorize/adminuserAuthorize";

/**
 * Parameter decorator injecting authenticated Adminuser payload.
 *
 * Usage: someMethod(@AdminuserAuth() admin: AdminuserPayload) {}
 */
export const AdminuserAuth = (): ParameterDecorator => (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
): void => {
  // Add Bearer security requirement to Swagger route
  SwaggerCustomizer((props) => {
    props.route.security ??= [];
    props.route.security.push({ bearer: [] });
  })(target, propertyKey as string, undefined!);

  // Bind singleton param decorator instance
  singleton.get()(target, propertyKey, parameterIndex);
};

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return adminuserAuthorize(request);
  })(),
);
