// File path: src/decorators/GuestvisitorAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { guestvisitorAuthorize } from "../providers/authorize/guestvisitorAuthorize";

/**
 * Parameter decorator to authorize Guestvisitor via Bearer JWT.
 *
 * Adds Bearer security to Swagger and injects authenticated payload
 * into controller method parameter.
 */
export const GuestvisitorAuth =
  (): ParameterDecorator =>
  (
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
    return guestvisitorAuthorize(request);
  })(),
);
