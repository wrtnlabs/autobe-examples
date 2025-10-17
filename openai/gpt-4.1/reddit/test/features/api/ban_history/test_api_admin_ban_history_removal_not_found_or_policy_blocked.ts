import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Test ban history deletion negative paths (not found or protected by policy).
 *
 * 1. Register a new community platform admin (for authentication context).
 * 2. As admin, attempt to permanently delete a random (non-existent) banHistoryId.
 *    Confirm the API blocks deletion and returns an error.
 * 3. Repeat deletion with another random id to simulate a protected/policy-blocked
 *    banHistoryId.
 * 4. Assert all error cases trigger error responses and deletion does not succeed.
 */
export async function test_api_admin_ban_history_removal_not_found_or_policy_blocked(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt ban history deletion with non-existent id
  await TestValidator.error(
    "deletion of non-existent banHistoryId should fail",
    async () => {
      await api.functional.communityPlatform.admin.banHistories.erase(
        connection,
        {
          banHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Attempt ban history deletion where deletion is blocked by policy (simulate as random id)
  await TestValidator.error(
    "deletion of protected banHistoryId should fail",
    async () => {
      await api.functional.communityPlatform.admin.banHistories.erase(
        connection,
        {
          banHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
