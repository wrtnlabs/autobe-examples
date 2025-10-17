import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate that an authenticated admin can permanently remove a ban history
 * record by id under exceptional compliance scenarios (such as wrongful bans or
 * erasure requests).
 *
 * 1. Admin joins (registers)
 * 2. Generate a UUID for banHistoryId
 * 3. Admin successfully deletes (erases) the ban history entry with that id
 * 4. Assert no error is thrown (operation completes)
 * 5. Attempt to erase another random (non-existent) banHistoryId, expect error
 */
export async function test_api_admin_ban_history_permanent_removal_compliance(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminRes);

  // Step 2: Generate a UUID for banHistoryId
  const banHistoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to permanently erase the ban history record
  await api.functional.communityPlatform.admin.banHistories.erase(connection, {
    banHistoryId,
  });

  // Step 5: Attempt to erase a random (non-existent/retention-protected) record and expect error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to permanently erase non-existent or protected ban history entry",
    async () => {
      await api.functional.communityPlatform.admin.banHistories.erase(
        connection,
        {
          banHistoryId: randomId,
        },
      );
    },
  );
}
