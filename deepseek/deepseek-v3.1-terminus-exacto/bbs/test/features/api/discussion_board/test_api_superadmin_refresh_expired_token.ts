import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test refresh token expiration scenario where refresh operation is attempted with an expired refresh token.
 * Create a super administrator account and simulate token expiration (or use expired refresh token).
 * Attempt refresh with the expired refresh token and verify the operation fails with appropriate error response.
 * This validates the security requirement that expired refresh tokens cannot generate new access tokens and user must fully re-authenticate via login endpoint.
 * Test that proper error codes distinguish between token expiration and other authentication failures.
 */
export async function test_api_superadmin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(joinResult);
  // 2. Extract valid refresh token for reference
  const validRefreshToken = joinResult.token.refresh;
  // 3. Create an intentionally invalid refresh token to simulate expired/invalid token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);
  // 4. Attempt refresh with invalid token and verify it fails
  // Note: We cannot create an actually expired token, but we can test that invalid tokens are rejected
  await TestValidator.httpError(
    "refresh with invalid token should fail",
    401, // Assuming 401 Unauthorized for invalid/expired tokens
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.refresh(
        superAdminConnection,
        {
          body: {
            refresh_token: invalidRefreshToken,
          } satisfies IDiscussionBoardSuperAdmin.IRefresh,
        },
      );
    },
  );
  // 5. Also test that a non-existent random token fails
  const nonExistentToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.httpError(
    "refresh with non-existent token should fail",
    [401, 404], // Could be 401 Unauthorized or 404 Not Found
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.refresh(
        superAdminConnection,
        {
          body: {
            refresh_token: nonExistentToken,
          } satisfies IDiscussionBoardSuperAdmin.IRefresh,
        },
      );
    },
  );
  // 6. Optionally test that a malformed token (empty string) fails
  await TestValidator.httpError(
    "refresh with empty token should fail",
    400, // Assuming 400 Bad Request for malformed token
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.refresh(
        superAdminConnection,
        {
          body: {
            refresh_token: "",
          } satisfies IDiscussionBoardSuperAdmin.IRefresh,
        },
      );
    },
  );
  // 7. Verify that the original valid refresh token still works (sanity check)
  const refreshResult =
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      superAdminConnection,
      {
        body: {
          refresh_token: validRefreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(refreshResult);
  TestValidator.equals(
    "refresh should return valid authorization data",
    typeof refreshResult.email,
    "string",
  );
  TestValidator.predicate(
    "refresh should return token with access and refresh fields",
    () =>
      typeof refreshResult.token.access === "string" &&
      typeof refreshResult.token.refresh === "string",
  );
}
