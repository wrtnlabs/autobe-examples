// File path: src/decorators/GuestuserAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { guestuserAuthorize } from "../providers/authorize/guestuserAuthorize";

/**
 * Parameter decorator for authenticating guestuser via Bearer JWT.
 *
 * Usage:
 *   controllerMethod(@GuestuserAuth() user: GuestuserPayload) { ... }
 */
export const GuestuserAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    // Add Bearer security requirement to Swagger route metadata
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);

    // Register the parameter decorator instance via singleton
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return guestuserAuthorize(request);
  })(),
);
