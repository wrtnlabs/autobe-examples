import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test the successful admin token refresh workflow.
 *
 * This test executes the following steps:
 *
 * 1. Register a new admin user using /auth/admin/join with a valid user ID.
 * 2. Use the issued refresh token to request a new access token from
 *    /auth/admin/refresh.
 * 3. Validate that the new token is correctly issued with appropriate admin
 *    privileges.
 *
 * The test asserts that tokens are well-formed, associated user data is valid,
 * and connection headers are updated accordingly.
 */
export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Generate a fake user UUID for creating admin
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register a new admin user
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userId,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 3. Use the issued refresh token to request a new access token
  const newAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: adminAuthorized.token.refresh,
      } satisfies IRedditCommunityAdmin.IRefresh,
    });
  typia.assert(newAuthorized);

  // 4. Validate that the new token differs from the old one but maintains the same user ID
  TestValidator.notEquals(
    "refresh token should change",
    newAuthorized.token.refresh,
    adminAuthorized.token.refresh,
  );

  TestValidator.equals(
    "user ID should be preserved",
    newAuthorized.user_id,
    adminAuthorized.user_id,
  );

  // 5. Validate the admin ID remains consistent
  TestValidator.equals(
    "admin ID should be the same",
    newAuthorized.id,
    adminAuthorized.id,
  );

  // 6. Validate that the tokens include access tokens that are non-empty strings
  TestValidator.predicate(
    "access token is non-empty string",
    typeof newAuthorized.token.access === "string" &&
      newAuthorized.token.access.length > 0,
  );

  // 7. Validate that the token expiration is a valid ISO date-time string
  //    and that refreshable_until is not before expired_at
  const expiredAtDate = new Date(newAuthorized.token.expired_at);
  const refreshableUntilDate = new Date(newAuthorized.token.refreshable_until);

  TestValidator.predicate(
    "expired_at is a valid ISO date-time",
    !isNaN(expiredAtDate.getTime()),
  );

  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    !isNaN(refreshableUntilDate.getTime()),
  );

  TestValidator.predicate(
    "refreshable_until is not before expired_at",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );

  // 8. Validate associated user summary contains valid UUID and an email string
  if (newAuthorized.user !== undefined) {
    typia.assert(newAuthorized.user);
    TestValidator.predicate(
      "user summary id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        newAuthorized.user.id,
      ),
    );
    TestValidator.predicate(
      "user summary email is non-empty",
      typeof newAuthorized.user.email === "string" &&
        newAuthorized.user.email.length > 0,
    );
  }
}
