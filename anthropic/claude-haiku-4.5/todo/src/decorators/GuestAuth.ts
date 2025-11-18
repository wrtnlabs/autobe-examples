import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { guestAuthorize } from "../providers/authorize/guestAuthorize";

/**
 * Guest authentication decorator.
 * 
 * Marks endpoints as accessible to unauthenticated users (guests).
 * Injects a GuestPayload into the decorated parameter.
 */
export const GuestAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    SwaggerCustomizer((props) => {
      // Guest endpoints don't require authentication
      // No security requirement is added to Swagger documentation
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, _ctx: ExecutionContext) => {
    return guestAuthorize();
  })(),
);