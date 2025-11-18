import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";
import { userAuthorize } from "../providers/authorize/userAuthorize";

/**
 * Injects authenticated user information into controller methods for routes requiring user access.
 * Adds Bearer token security schema to openapi documentation.
 *
 * Usage: @UserAuth() user: UserPayload
 */
export const UserAuth = (): ParameterDecorator => (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
): void => {
  SwaggerCustomizer((props) => {
    props.route.security ??= [];
    props.route.security.push({
      bearer: [],
    });
  })(target, propertyKey as string, undefined!);
  singleton.get()(target, propertyKey, parameterIndex);
};

const singleton = new Singleton(() =>
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return userAuthorize(request);
  })(),
);
