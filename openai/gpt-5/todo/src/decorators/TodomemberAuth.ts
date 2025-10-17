// File path: src/decorators/TodomemberAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { todomemberAuthorize } from "../providers/authorize/todomemberAuthorize";

/**
 * Decorator that authenticates requests as Todo Member via Bearer token.
 *
 * Usage:
 *   @Get("/me/todos")
 *   public async list(@TodomemberAuth() me: TodomemberPayload) { ... }
 */
export const TodomemberAuth = (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    // Add Bearer security to Swagger route
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);

    // Bind the parameter decorator singleton instance
    singleton.get()(target, propertyKey, parameterIndex);
  };

// Singleton instance for efficient decorator creation
const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return todomemberAuthorize(request);
  })(),
);
