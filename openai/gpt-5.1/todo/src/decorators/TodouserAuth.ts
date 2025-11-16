import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { todouserAuthorize } from "../providers/authorize/todouserAuthorize";
import { TodouserPayload } from "./payload/TodouserPayload";

/**
 * Parameter decorator for authenticating todouser actors.
 *
 * Usage:
 * ```ts
 * @Get("/me")
 * public async getMe(@TodouserAuth() me: TodouserPayload) {
 *   return me;
 * }
 * ```
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
  createParamDecorator(
    async (
      _data: unknown,
      ctx: ExecutionContext,
    ): Promise<TodouserPayload> => {
      const request = ctx.switchToHttp().getRequest();
      return todouserAuthorize(request);
    },
  )(),
);
