import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { todouserAuthorize } from "../providers/authorize/todouserAuthorize";

/**
 * Parameter decorator for todoUser authentication.
 * Automatically injects TodouserPayload if valid JWT is present.
 */
export const TodouserAuth =
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
    return todouserAuthorize(request);
  })(),
);
