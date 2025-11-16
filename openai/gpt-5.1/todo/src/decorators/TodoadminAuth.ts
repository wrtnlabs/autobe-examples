import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { todoadminAuthorize } from "../providers/authorize/todoadminAuthorize";
import { TodoadminPayload } from "./payload/TodoadminPayload";

/**
 * Parameter decorator that injects an authenticated {@link TodoadminPayload}
 * into controller handlers after validating the bearer token as a todoAdmin.
 */
export const TodoadminAuth =
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

const singleton = new Singleton<ParameterDecorator>(() =>
  createParamDecorator(
    async (
      _data: unknown,
      ctx: ExecutionContext,
    ): Promise<TodoadminPayload> => {
      const request = ctx.switchToHttp().getRequest();
      return todoadminAuthorize(request);
    },
  )(),
);
