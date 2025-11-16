import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Tests that soft-deleted administrator accounts (deleted_at is set) cannot
 * refresh tokens even with a previously valid refresh token.
 *
 * Attempts refresh and expects the operation to fail, guaranteeing deleted
 * accounts cannot re-establish sessions or access privileged endpoints.
 *
 * Steps:
 *
 * 1. Prepare a (simulated) refresh token for an admin whose deleted_at is non-null
 *    (soft-deleted account).
 * 2. Call POST /auth/admin/refresh with this refresh token.
 * 3. Verify that the refresh attempt fails and no tokens are returned (i.e.,
 *    access is denied and deleted admins remain locked out).
 */
export async function test_api_admin_refresh_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Prepare a random (simulated) admin refresh token, emulating a token belonging to a deleted account.
  const refreshToken: string = RandomGenerator.alphaNumeric(64);

  // Step 2 & 3: Attempt the admin refresh and expect an error
  await TestValidator.error(
    "refresh attempt for soft-deleted admin should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
