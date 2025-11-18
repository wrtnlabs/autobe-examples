import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { memberuserAuthorize } from "../providers/authorize/memberuserAuthorize";

/**
 * Parameter decorator for authenticating regular member users.
 *
 * When applied to a controller method parameter, it:
 * - Registers bearer authentication in the Swagger documentation
 * - Resolves the parameter value to the authenticated MemberuserPayload
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
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return memberuserAuthorize(request);
  })(),
);
