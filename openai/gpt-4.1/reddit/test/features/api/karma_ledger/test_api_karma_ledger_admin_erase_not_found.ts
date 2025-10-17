import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate that trying to delete a non-existent karma ledger as an admin
 * triggers the correct error behavior.
 *
 * Steps:
 *
 * 1. Register a new platform admin with unique random email and password via
 *    /auth/admin/join.
 * 2. Attempt to erase (DELETE) a karma ledger using a random/invalid UUID for
 *    karmaLedgerId with the admin credentials.
 * 3. Assert that an error is thrown for non-existent ID (not a silent failure or
 *    success), using await TestValidator.error with correct async handling.
 * 4. Do not validate status code or message; only check that an error condition is
 *    triggered.
 */
export async function test_api_karma_ledger_admin_erase_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to erase non-existent karma ledger
  const randomKarmaLedgerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error when deleting non-existent karma ledger",
    async () => {
      await api.functional.communityPlatform.admin.karmaLedgers.erase(
        connection,
        {
          karmaLedgerId: randomKarmaLedgerId,
        },
      );
    },
  );
}
