import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";
import { adminAuthorize } from "../providers/authorize/adminAuthorize";

/**
 * Parameter decorator to inject authenticated AdminPayload into controller route handler.
 * Adds bearer token security schema to Swagger documentation.
 */
export const AdminAuth = (): ParameterDecorator => (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number
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
    return adminAuthorize(request);
  })(),
);
