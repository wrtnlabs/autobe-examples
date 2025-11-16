import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { guestuserAuthorize } from "../providers/authorize/guestuserAuthorize";

/**
 * NestJS parameter decorator for authenticating guestUser actors.
 *
 * Usage:
 * ```ts
 * @Get("/public")
 * public async getPublic(@GuestuserAuth() guest: GuestuserPayload) {
 *   // guest contains the authenticated guest user payload
 * }
 * ```
 */
export const GuestuserAuth =
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
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return guestuserAuthorize(request);
  })(),
);
