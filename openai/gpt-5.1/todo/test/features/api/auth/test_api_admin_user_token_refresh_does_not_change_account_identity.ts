import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that adminUser token refresh preserves account identity and core
 * profile fields while issuing a new authorization token bundle.
 *
 * Business intent:
 *
 * - Ensure that calling POST /auth/adminUser/refresh does not switch the admin
 *   identity to another account and keeps key profile state stable.
 * - Confirm that the refresh flow only renews tokens and possibly touch
 *   login-related timestamps, without altering immutable identity attributes.
 *
 * Test steps:
 *
 * 1. Perform an initial refresh call to obtain a baseline
 *    ITodoAppAdminUser.IAuthorized context (the "first" snapshot).
 * 2. Immediately perform a second refresh call to obtain another
 *    ITodoAppAdminUser.IAuthorized context (the "second" snapshot).
 * 3. Assert that identity and core state fields are identical between the two
 *    snapshots.
 * 4. Assert that at least one token field differs between the two snapshots,
 *    proving that a genuine refresh occurred.
 */
export async function test_api_admin_user_token_refresh_does_not_change_account_identity(
  connection: api.IConnection,
) {
  // 1. First refresh: treat as baseline authorized admin context
  const firstRequestBody = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppAdminUser.IRefresh;

  const first: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: firstRequestBody,
    });
  typia.assert(first);
  typia.assert<IAuthorizationToken>(first.token);

  // 2. Second refresh: simulate subsequent refresh, possibly with a new token
  const secondRequestBody = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppAdminUser.IRefresh;

  const second: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: secondRequestBody,
    });
  typia.assert(second);
  typia.assert<IAuthorizationToken>(second.token);

  // 3. Identity invariants: id and email must be preserved
  TestValidator.equals(
    "admin user id must remain the same across refreshes",
    first.id,
    second.id,
  );
  TestValidator.equals(
    "admin user email must remain the same across refreshes",
    first.email,
    second.email,
  );

  // 4. Core account state invariants
  TestValidator.equals(
    "admin status must remain stable across refreshes",
    first.status,
    second.status,
  );
  TestValidator.equals(
    "failed_login_count must remain stable across refreshes",
    first.failed_login_count,
    second.failed_login_count,
  );
  TestValidator.equals(
    "created_at must remain stable across refreshes",
    first.created_at,
    second.created_at,
  );
  TestValidator.equals(
    "deleted_at must remain stable across refreshes",
    first.deleted_at ?? null,
    second.deleted_at ?? null,
  );

  // 5. Token bundle should change in at least one field to reflect a true refresh
  const tokenChanged: boolean =
    first.token.access !== second.token.access ||
    first.token.refresh !== second.token.refresh ||
    first.token.expired_at !== second.token.expired_at ||
    first.token.refreshable_until !== second.token.refreshable_until;

  await TestValidator.predicate(
    "at least one token field must change between refresh responses",
    async () => tokenChanged,
  );

  // 6. Allow updated_at and last_login_at to differ but ensure they are valid
  // date-time strings via typia.assert on the entire IAuthorized structure.
  // No additional assertions are required here because typia.assert already
  // validates formats and presence.
}
