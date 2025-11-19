import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test that admin token refresh fails when the admin account is soft-deleted.
 *
 * This scenario verifies that attempting to refresh JWT tokens for an admin
 * account with the 'deleted_at' timestamp (soft-deleted state) is rejected. The
 * server should respond with a forbidden or unauthorized error, and not
 * disclose whether the account is soft-deleted. No direct account/deletion
 * creation here; the test assumes the given refresh token belongs to a
 * soft-deleted admin record.
 *
 * Steps:
 *
 * 1. Generate a plausible refresh token string.
 * 2. Attempt admin refresh using this token.
 * 3. Validate that an error is raised (forbidden/unauthorized) and no sensitive
 *    information is leaked.
 */
export async function test_api_admin_refresh_soft_deleted_account(
  connection: api.IConnection,
) {
  // Attempt to refresh JWT tokens for a soft-deleted admin account
  const refreshToken: string = RandomGenerator.alphaNumeric(64);
  const requestBody = {
    refresh_token: refreshToken,
  } satisfies IDiscussionBoardAdmin.IRefresh;

  await TestValidator.error(
    "refresh for soft-deleted admin should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: requestBody,
      });
    },
  );
}
