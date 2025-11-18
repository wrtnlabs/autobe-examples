import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate successful registration of a new administrative user.
 *
 * This E2E test exercises POST /auth/adminUser/join to ensure that a new admin
 * account can be provisioned with minimal required data and that the returned
 * authorization payload correctly represents the just-created admin user and
 * token bundle.
 *
 * Flow:
 *
 * 1. Build a unique, valid email and strong password for the new admin.
 * 2. Optionally generate a human-friendly display_name.
 * 3. Call api.functional.auth.adminUser.join with ITodoAppAdminUser.IJoin.
 * 4. Assert the response matches ITodoAppAdminUser.IAuthorized via typia.assert.
 * 5. Perform business assertions on key fields (email echo, display_name,
 *    failed_login_count, status non-emptiness, created/updated timestamps,
 *    deleted_at nullish) and token contents (access/refresh strings and future
 *    expiration timestamps).
 */
export async function test_api_admin_user_join_successful_registration(
  connection: api.IConnection,
) {
  // 1. Prepare unique admin registration payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const displayName: string = RandomGenerator.name(1);

  const joinBody = {
    email,
    password,
    display_name: displayName,
  } satisfies ITodoAppAdminUser.IJoin;

  // 2. Call join endpoint
  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });

  // 3. Type-level validation of response structure
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 4. Business assertions on user identity fields
  TestValidator.equals(
    "joined admin email should echo input email",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "joined admin display_name should echo provided displayName",
    authorized.display_name ?? undefined,
    displayName,
  );

  TestValidator.equals(
    "newly joined admin should have zero failed_login_count",
    authorized.failed_login_count,
    0,
  );

  TestValidator.predicate(
    "newly joined admin status should be a non-empty string",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );

  // last_login_at should be nullish (not yet logged in), but spec allows
  // null | undefined, so we only assert it is not a concrete non-empty value.
  TestValidator.predicate(
    "newly joined admin last_login_at should be nullish or undefined",
    authorized.last_login_at === null || authorized.last_login_at === undefined,
  );

  // created_at and updated_at should be valid date-time strings; typia.assert
  // already checked the format, so here we only enforce logical ordering.
  const createdAt = new Date(authorized.created_at).getTime();
  const updatedAt = new Date(authorized.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid timestamp",
    Number.isFinite(createdAt),
  );

  TestValidator.predicate(
    "updated_at should be a valid timestamp",
    Number.isFinite(updatedAt),
  );

  TestValidator.predicate(
    "updated_at should be same or after created_at",
    updatedAt >= createdAt,
  );

  // deleted_at must be nullish for a freshly created (non-deleted) account.
  TestValidator.predicate(
    "deleted_at should be nullish for new admin user",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 5. Token bundle validations
  const token = authorized.token;

  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  const now = Date.now();
  const expiredAtMs = new Date(token.expired_at).getTime();
  const refreshableUntilMs = new Date(token.refreshable_until).getTime();

  TestValidator.predicate(
    "expired_at should be a valid future timestamp",
    Number.isFinite(expiredAtMs) && expiredAtMs > now,
  );

  TestValidator.predicate(
    "refreshable_until should be a valid future timestamp",
    Number.isFinite(refreshableUntilMs) && refreshableUntilMs > now,
  );

  TestValidator.predicate(
    "refreshable_until should not be earlier than expired_at",
    refreshableUntilMs >= expiredAtMs,
  );
}
