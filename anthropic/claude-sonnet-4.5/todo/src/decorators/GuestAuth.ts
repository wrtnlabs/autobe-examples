import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { guestAuthorize } from "../providers/authorize/guestAuthorize";

/**
 * Guest authentication decorator for unauthenticated access.
 *
 * This decorator is used for routes that allow guest (unauthenticated) access.
 * Guests can only access public information such as landing pages and
 * registration/login forms. They cannot create or view any todo items.
 *
 * Usage:
 * ```typescript
 * @Controller("public")
 * export class PublicController {
 *   @Get("landing")
 *   public async getLanding(
 *     @GuestAuth() guest: GuestPayload,
 *   ): Promise<LandingPageResponse> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export const GuestAuth =
  (): ParameterDecorator =>
  (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    SwaggerCustomizer((props) => {
      // Guest endpoints do not require authentication
      // No security schema needed for guest access
      props.route.security ??= [];
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return guestAuthorize(request);
  })(),
);
