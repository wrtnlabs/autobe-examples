import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { adminuserAuthorize } from "../providers/authorize/adminuserAuthorize";
import { AdminuserPayload } from "./payload/AdminuserPayload";

/**
 * Parameter decorator to inject an authenticated AdminuserPayload.
 *
 * Usage:
 * ```ts
 * @Get("/secure")
 * someHandler(@AdminuserAuth() admin: AdminuserPayload) {
 *   // ...
 * }
 * ```
 */
export const AdminuserAuth =
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
    async (_data: unknown, ctx: ExecutionContext): Promise<AdminuserPayload> => {
      const request = ctx.switchToHttp().getRequest();
      return adminuserAuthorize(request);
    },
  )(),
);
