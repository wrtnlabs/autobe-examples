// File path: src/decorators/MemberAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { memberAuthorize } from "../providers/authorize/memberAuthorize";

/**
 * Parameter decorator to inject authenticated Member payload into controller methods.
 *
 * Usage:
 *   @Get()
 *   public async example(@MemberAuth() member: MemberPayload) { ... }
 */
export const MemberAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    // Add bearer security requirement to Swagger docs for this route
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({
        bearer: [],
      });
    })(target, propertyKey as string, undefined!);

    // Bind the param decorator instance via singleton for performance
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return memberAuthorize(request);
  })(),
);
