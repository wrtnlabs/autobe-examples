import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { adminAuthorize } from "../providers/authorize/adminAuthorize";

/**
 * Decorator to inject authenticated AdminPayload into route handlers.
 * Auto-adds Bearer JWT requirement in Swagger.
 */
export const AdminAuth = (): ParameterDecorator => (
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
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return adminAuthorize(request);
  })(),
);
