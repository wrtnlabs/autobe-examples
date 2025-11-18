import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { adminAuthorize } from "../providers/authorize/adminAuthorize";
/**
 * AdminAuth decorator applies JWT Bearer authorization for admin actor, enforcing role.
 * Enriches Swagger docs and injects AdminPayload parameter to controller methods.
 */
export const AdminAuth = (): ParameterDecorator =>
  (target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return adminAuthorize(request);
  })(),
);
