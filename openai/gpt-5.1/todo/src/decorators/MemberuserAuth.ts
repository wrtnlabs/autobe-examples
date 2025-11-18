import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { memberuserAuthorize } from "../providers/authorize/memberuserAuthorize";
import type { MemberuserPayload } from "./payload/MemberuserPayload";

/**
 * Parameter decorator that injects authenticated MemberuserPayload.
 *
 * Usage:
 * ```ts
 * @Get("/me")
 * public async getMe(@MemberuserAuth() me: MemberuserPayload) {
 *   return me;
 * }
 * ```
 */
export const MemberuserAuth =
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
    async (_data: unknown, ctx: ExecutionContext): Promise<MemberuserPayload> => {
      const request = ctx.switchToHttp().getRequest();
      return memberuserAuthorize(request);
    },
  )(),
);
