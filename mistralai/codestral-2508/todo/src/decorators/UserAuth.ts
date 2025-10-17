import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { userAuthorize } from "../providers/authorize/userAuthorize";

/**
 * Decorator for user authentication and authorization.
 *
 * This decorator integrates with Swagger to add bearer token security schema to API documentation.
 * It uses the userAuthorize function to verify the user's JWT token and check their existence in the database.
 * The Singleton pattern ensures efficient decorator instance management.
 *
 * @returns A parameter decorator that injects the authenticated user payload into the controller method.
 */
export const UserAuth =
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
    return userAuthorize(request);
  })(),
);