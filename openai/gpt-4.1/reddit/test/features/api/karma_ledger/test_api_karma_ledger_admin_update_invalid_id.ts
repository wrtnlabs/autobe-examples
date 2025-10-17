import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";

/**
 * Test updating a karma ledger with an invalid karmaLedgerId.
 *
 * 1. Register as a new admin.
 * 2. Authenticate as the created admin account.
 * 3. Attempt to update a karma ledger using a random UUID (non-existent ID).
 * 4. Validate that the API throws an error and does not update any ledger.
 */
export async function test_api_karma_ledger_admin_update_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register as a new admin
  const adminJoinBody = typia.random<ICommunityPlatformAdmin.ICreate>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Attempt to update a non-existent karma ledger with random UUID
  const invalidKarmaLedgerId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = typia.random<ICommunityPlatformKarmaLedger.IUpdate>();

  await TestValidator.error(
    "update with invalid karmaLedgerId should fail",
    async () => {
      await api.functional.communityPlatform.admin.karmaLedgers.update(
        connection,
        {
          karmaLedgerId: invalidKarmaLedgerId,
          body: updateBody,
        },
      );
    },
  );
}
