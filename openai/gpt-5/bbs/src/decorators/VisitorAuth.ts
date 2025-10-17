// File path: src/decorators/VisitorAuth.ts
import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { visitorAuthorize } from "../providers/authorize/visitorAuthorize";

/**
 * Parameter decorator for Visitor authentication.
 *
 * Adds bearer token security to Swagger docs and injects authenticated
 * VisitorPayload into controller handlers.
 */
export const VisitorAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return visitorAuthorize(request);
  })(),
);
