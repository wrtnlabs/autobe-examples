// File path: src/decorators/CommunitymoderatorAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { communitymoderatorAuthorize } from "../providers/authorize/communitymoderatorAuthorize";

/**
 * Parameter decorator for authenticating Community Moderators.
 *
 * Usage:
 *   someHandler(@CommunitymoderatorAuth() moderator: CommunitymoderatorPayload) { ... }
 */
export const CommunitymoderatorAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    // Register bearer security for Swagger docs
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);

    // Bind singleton param decorator instance
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return communitymoderatorAuthorize(request);
  })(),
);
