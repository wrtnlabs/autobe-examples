import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

/**
 * Test administrator JWT token refresh.
 *
 * This function tests the complete workflow of administrator token refresh in
 * the econPolDiscussionBoard system. The test performs the following steps:
 *
 * 1. Creates a new administrator account using the /auth/admin/join API,
 *    generating login credentials.
 * 2. Receives JWT authentication tokens (access and refresh) from the join
 *    operation.
 * 3. Uses the refresh endpoint /auth/admin/refresh to submit the valid refresh
 *    token to obtain new tokens.
 * 4. Validates that new access and refresh tokens are successfully issued.
 * 5. Checks that the session remains authenticated without needing to log in
 *    again.
 *
 * All token formats and timestamps are verified using typia.assert.
 */
export async function test_api_auth_admin_refresh_token(
  connection: api.IConnection,
) {
  // 1. Create a new administrator by calling join
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;

  const authorizedAdmin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(authorizedAdmin);

  // 2. Extract the refresh token from the authorized response
  const refreshToken = authorizedAdmin.token.refresh;

  // 3. Call refresh endpoint with the refresh token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IEconPolDiscussionBoardAdmin.IRefresh;

  const refreshedAuthorizedAdmin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAuthorizedAdmin);

  // 4. Validate that new tokens were issued and differ from the original
  TestValidator.predicate(
    "access token should be different after refresh",
    authorizedAdmin.token.access !== refreshedAuthorizedAdmin.token.access,
  );
  TestValidator.predicate(
    "refresh token should be different after refresh",
    authorizedAdmin.token.refresh !== refreshedAuthorizedAdmin.token.refresh,
  );

  // 5. Validate that the administrator username and email remain the same
  TestValidator.equals(
    "administrator username remains consistent",
    refreshedAuthorizedAdmin.adminUsername,
    authorizedAdmin.adminUsername,
  );
  TestValidator.equals(
    "administrator email remains consistent",
    refreshedAuthorizedAdmin.email,
    authorizedAdmin.email,
  );

  // 6. Validate token expiration timestamps are strings with date-time format
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAuthorizedAdmin.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAuthorizedAdmin.token.refreshable_until,
  );
}
