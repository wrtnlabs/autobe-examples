import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { adminAuthorize } from "../providers/authorize/adminAuthorize";

/**
 * NestJS parameter decorator for admin authentication.
 *
 * This decorator automatically validates admin authentication by:
 * 1. Adding bearer token security schema to Swagger documentation
 * 2. Extracting and validating JWT token from request headers
 * 3. Injecting the authenticated admin payload into the controller method parameter
 *
 * @example
 * ```typescript
 * @Controller('admin')
 * export class AdminController {
 *   @Get('dashboard')
 *   async getDashboard(
 *     @AdminAuth() admin: AdminPayload
 *   ) {
 *     return { adminId: admin.id };
 *   }
 * }
 * ```
 *
 * @returns ParameterDecorator that injects AdminPayload into the decorated parameter
 */
export const AdminAuth =
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
    return adminAuthorize(request);
  })(),
);
