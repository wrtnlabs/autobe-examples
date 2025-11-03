import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { customerAuthorize } from "../providers/authorize/customerAuthorize";

/**
 * Parameter decorator to authenticate Customer users via JWT.
 *
 * Adds bearer authentication to Swagger docs and injects the authenticated CustomerPayload.
 * Example usage:
 * ```ts
 * getProfile(@CustomerAuth() customer: CustomerPayload) {...}
 * ```
 */
export const CustomerAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return customerAuthorize(request);
  })(),
);
