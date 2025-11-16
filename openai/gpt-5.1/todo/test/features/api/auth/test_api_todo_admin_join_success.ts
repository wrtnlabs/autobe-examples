import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate successful registration (join) of a new todoAdmin administrator.
 *
 * This test covers the happy path for the public `/auth/todoAdmin/join`
 * endpoint using a well-formed `ITodoAppTodoAdminJoin.IRequest` payload. It
 * ensures that:
 *
 * 1. A syntactically valid, unique admin email and strong password are accepted by
 *    the join endpoint.
 * 2. The response structurally conforms to `ITodoAppTodoAdmin.IAuthorized`.
 * 3. Core business expectations hold, including:
 *
 *    - The email in the response matches the requested email.
 *    - An admin `id` is issued as a UUID.
 *    - The admin account exposes creation and update timestamps.
 *    - A non-empty JWT token bundle is issued for subsequent authenticated
 *         operations.
 *
 * Direct persistence or secondary protected-endpoint checks are intentionally
 * out of scope because no such APIs are provided in this context; instead, the
 * test relies on DTO-level validation and key field assertions.
 */
export async function test_api_todo_admin_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare a realistic registration payload for a new todoAdmin.
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-12345";
  const displayName = RandomGenerator.name(2);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const body = {
    email,
    password,
    displayName,
    href,
    referrer,
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  // 2. Call the join endpoint to register the new admin account.
  const authorizedAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body,
    });

  // 3. Structural validation of the response payload.
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorizedAdmin);

  // 4. Business-level assertions.
  // 4-1. Email in response must echo the requested email.
  TestValidator.equals(
    "todoAdmin join: response email matches request email",
    authorizedAdmin.email,
    email,
  );

  // 4-2. Display name, when provided, should be propagated (or at least not contradict).
  if (displayName !== null && displayName !== undefined) {
    TestValidator.equals(
      "todoAdmin join: response display_name matches request displayName when provided",
      authorizedAdmin.display_name ?? null,
      displayName,
    );
  }

  // 4-3. Status should be a non-empty string indicating some lifecycle state (e.g., "active").
  TestValidator.predicate(
    "todoAdmin join: status is a non-empty string",
    () =>
      typeof authorizedAdmin.status === "string" &&
      authorizedAdmin.status.trim().length > 0,
  );

  // 4-4. Token bundle must be present and contain non-empty access/refresh tokens.
  const token: IAuthorizationToken = authorizedAdmin.token;
  TestValidator.predicate(
    "todoAdmin join: access token is non-empty",
    () => typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "todoAdmin join: refresh token is non-empty",
    () => typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 4-5. Token date-time fields must be strings; detailed format validation is
  // already guaranteed by typia.assert above, so only basic sanity checks here.
  TestValidator.predicate(
    "todoAdmin join: expired_at is a non-empty string",
    () => typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "todoAdmin join: refreshable_until is a non-empty string",
    () =>
      typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // 4-6. Creation and update timestamps should be non-empty strings as well.
  TestValidator.predicate(
    "todoAdmin join: created_at is a non-empty string",
    () =>
      typeof authorizedAdmin.created_at === "string" &&
      authorizedAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "todoAdmin join: updated_at is a non-empty string",
    () =>
      typeof authorizedAdmin.updated_at === "string" &&
      authorizedAdmin.updated_at.length > 0,
  );
}
