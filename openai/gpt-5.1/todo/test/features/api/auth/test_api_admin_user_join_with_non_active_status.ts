import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that admin join endpoint respects non-default initial status.
 *
 * Business goal:
 *
 * - When a new admin registers through /auth/adminUser/join with a custom status
 *   (e.g. "pending" or "disabled" instead of the typical "active"), the backend
 *   must persist that status into todo_app_adminusers.status and return it
 *   unchanged in ITodoAppAdminUser.IAuthorized.
 * - The endpoint must also return a structurally valid authorization token so
 *   that client apps can treat the admin as an authenticated principal,
 *   regardless of whether business logic later restricts their capabilities
 *   based on status.
 *
 * Steps:
 *
 * 1. Build an ITodoAppAdminUser.IJoin payload:
 *
 *    - Email: unique, valid business-like email.
 *    - Password: random strong-looking string.
 *    - Display_name: set to either null or a random human-like name.
 *    - Status: set to a non-default value like "pending" to model non-active.
 *    - Ip: realistic IPv4 string.
 *    - Href: realistic current page URL.
 *    - Referrer: realistic referring URL.
 * 2. Call api.functional.auth.adminUser.join(connection, { body }).
 * 3. Typia.assert that the response is ITodoAppAdminUser.IAuthorized.
 * 4. Validate business expectations:
 *
 *    - Response.status equals the requested non-default status.
 *    - Response.email equals requested email.
 *    - Id, created_at, updated_at are non-empty strings.
 * 5. Validate token structure:
 *
 *    - Token.access and token.refresh are non-empty strings.
 *    - Token.expired_at and token.refreshable_until are non-empty date-time strings.
 */
export async function test_api_admin_user_join_with_non_active_status(
  connection: api.IConnection,
) {
  // 1. Prepare join payload with non-default status
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const nonDefaultStatus = "pending";

  const joinBody = {
    email,
    password,
    display_name: null,
    status: nonDefaultStatus,
    ip: "192.168.0.10",
    href: "https://admin.todo-app.local/register",
    referrer: "https://admin.todo-app.local/login",
  } satisfies ITodoAppAdminUser.IJoin;

  // 2. Call join endpoint
  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });

  // 3. Type-level validation
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // 4. Business validations for core admin fields
  TestValidator.equals(
    "admin email in response matches join request",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "admin status in response matches non-default requested status",
    authorized.status,
    nonDefaultStatus,
  );

  TestValidator.predicate(
    "admin id should be a non-empty uuid string",
    authorized.id.length > 0,
  );

  TestValidator.predicate(
    "admin created_at should be a non-empty date-time string",
    authorized.created_at.length > 0,
  );

  TestValidator.predicate(
    "admin updated_at should be a non-empty date-time string",
    authorized.updated_at.length > 0,
  );

  // 5. Token structure validations
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be non-empty",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be non-empty",
    token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at must be a non-empty date-time string",
    token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until must be a non-empty date-time string",
    token.refreshable_until.length > 0,
  );
}
