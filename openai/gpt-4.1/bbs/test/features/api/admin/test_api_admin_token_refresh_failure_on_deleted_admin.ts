import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that the token refresh endpoint rejects refresh attempts for a
 * soft-deleted admin account.
 *
 * This test creates a new administrator, logs in to obtain a session and
 * refresh token, then soft-deletes the admin by setting a deleted_at timestamp
 * via the admin update API. Once soft-deleted, it attempts to use the refresh
 * token at /auth/admin/refresh to get new tokens. The business rule is that
 * deleted admins cannot refresh tokens, so the API must reject the call and
 * issue no tokens to the deleted account.
 *
 * Steps:
 *
 * 1. Register an admin account for refresh testing
 * 2. Log in as the admin to obtain a refresh token
 * 3. Set the deleted_at timestamp via admin update
 * 4. Attempt to refresh tokens using the soft-deleted admin's refresh token and
 *    confirm business rule enforcement (refresh is rejected, no new tokens
 *    issued)
 */
export async function test_api_admin_token_refresh_failure_on_deleted_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    // no avatar_url
  } satisfies IDiscussionBoardAdmin.ICreate;

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: adminRegistration,
  });
  typia.assert(createdAdmin);

  const adminId = typia.assert<string & tags.Format<"uuid">>(createdAdmin.id);
  const password = adminRegistration.password satisfies string as string;
  const email = adminRegistration.email satisfies string as string;

  // 2. Log in as the admin to obtain a session and refresh token
  const adminLogin = {
    email: email,
    password: password,
    href: "https://e2e.example.com/admin/login",
    referrer: "https://e2e.example.com/",
  } satisfies IDiscussionBoardAdmin.ILogin;

  const loginResult = await api.functional.auth.admin.login(connection, {
    body: adminLogin,
  });
  typia.assert(loginResult);
  const refreshToken = loginResult.token.refresh;
  typia.assert<string>(refreshToken);

  // 3. Soft-delete the admin account by setting deleted_at
  const deletionTimestamp = new Date().toISOString();
  await api.functional.discussionBoard.admin.admins.update(connection, {
    adminId: adminId,
    body: {
      email: email,
      display_name: createdAdmin.display_name,
      password_hash: RandomGenerator.alphaNumeric(32), // simulate new hash, required by schema
      is_locked: false,
      deleted_at: deletionTimestamp,
    } satisfies IDiscussionBoardAdmin.IUpdate,
  });
  // no assertion needed as business process is to soft-delete only

  // 4. Attempt to refresh tokens using the soft-deleted account's refresh token
  await TestValidator.error(
    "refresh must fail for soft-deleted admin",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
