// File path: src/decorators/VerifiedexpertAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { verifiedexpertAuthorize } from "../providers/authorize/verifiedexpertAuthorize";

/**
 * Parameter decorator to authenticate and inject a VerifiedexpertPayload.
 *
 * Usage:
 *   @Get()
 *   someEndpoint(@VerifiedexpertAuth() expert: VerifiedexpertPayload) { ... }
 */
export const VerifiedexpertAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    // Add Bearer auth requirement to Swagger docs for this route
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({
        bearer: [],
      });
    })(target, propertyKey as string, undefined!);

    // Bind the singleton-generated parameter decorator
    singleton.get()(target, propertyKey, parameterIndex);
  };

// Use Singleton to avoid re-creating the decorator per parameter binding
const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return verifiedexpertAuthorize(request);
  })(),
);
