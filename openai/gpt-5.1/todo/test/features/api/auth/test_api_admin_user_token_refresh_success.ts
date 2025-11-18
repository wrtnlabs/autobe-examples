import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_token_refresh_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful adminUser token refresh.
   *
   * This test simulates a previously authenticated administrative user by
   * generating an ITodoAppAdminUser.IAuthorized snapshot with typia.random. It
   * then uses the contained refresh token to call POST /auth/adminUser/refresh
   * via api.functional.auth.adminUser.refresh and validates that:
   *
   * 1. A new ITodoAppAdminUser.IAuthorized object is returned.
   * 2. Token.access and token.refresh are non-empty strings.
   * 3. Token.access and token.refresh differ from the previous tokens, modeling
   *    token rotation within this test context.
   * 4. Id and email remain stable across refresh (same admin identity).
   * 5. Deleted_at state is preserved across refresh (no unexpected deletion state
   *    change), and status is preserved.
   * 6. Updated_at is greater than or equal to the previous updated_at, reflecting
   *    security or session-related updates.
   * 7. Authorization token timestamps (expired_at, refreshable_until) are
   *    well-formed non-empty date-time strings.
   */

  // 1. Simulate a previously authorized admin user context.
  const previous: ITodoAppAdminUser.IAuthorized =
    typia.random<ITodoAppAdminUser.IAuthorized>();
  typia.assert(previous);

  // Extract previous tokens and identity fields for comparison.
  const prevAccess: string = previous.token.access;
  const prevRefresh: string = previous.token.refresh;
  const prevId = previous.id;
  const prevEmail = previous.email;
  const prevStatus = previous.status;
  const prevUpdatedAt = previous.updated_at;
  const prevDeletedAt = previous.deleted_at ?? null;

  // Basic sanity checks on the simulated previous snapshot.
  await TestValidator.predicate(
    "previous access token is non-empty",
    async () => prevAccess.length > 0,
  );
  await TestValidator.predicate(
    "previous refresh token is non-empty",
    async () => prevRefresh.length > 0,
  );

  // 2. Call refresh endpoint with the previous refresh token.
  const refreshed: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: {
        refresh_token: prevRefresh,
      } satisfies ITodoAppAdminUser.IRefresh,
    });
  typia.assert(refreshed);

  const newAccess: string = refreshed.token.access;
  const newRefresh: string = refreshed.token.refresh;

  // 3. Validate identity stability.
  TestValidator.equals(
    "admin id is stable across refresh",
    refreshed.id,
    prevId,
  );
  TestValidator.equals(
    "admin email is stable across refresh",
    refreshed.email,
    prevEmail,
  );

  // 4. Validate account state remains consistent and non-deleted state
  // does not unexpectedly change.
  const newDeletedAt = refreshed.deleted_at ?? null;
  TestValidator.equals(
    "admin deleted_at state is preserved across refresh",
    newDeletedAt,
    prevDeletedAt,
  );
  TestValidator.equals(
    "admin status is preserved across refresh",
    refreshed.status,
    prevStatus,
  );

  // 5. Token rotation: access and refresh tokens should change.
  await TestValidator.predicate(
    "access token is rotated on refresh",
    async () => newAccess.length > 0 && newAccess !== prevAccess,
  );
  await TestValidator.predicate(
    "refresh token is rotated on refresh",
    async () => newRefresh.length > 0 && newRefresh !== prevRefresh,
  );

  // 6. Authorization token timestamps must be valid non-empty date-time strings.
  await TestValidator.predicate(
    "access token expired_at is non-empty",
    async () => refreshed.token.expired_at.length > 0,
  );
  await TestValidator.predicate(
    "refresh token refreshable_until is non-empty",
    async () => refreshed.token.refreshable_until.length > 0,
  );

  // 7. updated_at should be monotonically non-decreasing.
  const prevUpdatedDate = new Date(prevUpdatedAt);
  const newUpdatedDate = new Date(refreshed.updated_at);
  await TestValidator.predicate(
    "updated_at is greater than or equal to previous updated_at",
    async () => newUpdatedDate.getTime() >= prevUpdatedDate.getTime(),
  );
}
