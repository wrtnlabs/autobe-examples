import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test successful permanent deletion of a business setting by an admin.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate as an admin, saving credentials and token
 * 2. Generate a unique settingKey representing a business setting
 * 3. Permanently delete the business setting using the erase API
 * 4. (Optionally) Attempt to re-delete the same settingKey to confirm
 *    irreversibility/error
 * 5. (Due to lack of read endpoint, logical verification is limited to deletion
 *    API error)
 *
 * The test ensures only authorized admins can delete, and deletion is permanent
 * and irreversible for the given key.
 */
export async function test_api_admin_business_setting_permanent_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // 2. Generate a unique settingKey
  const settingKey: string = RandomGenerator.alphaNumeric(16);

  // 3. Attempt to delete (permanently erase) the business setting (the setting may or may not exist)
  await api.functional.shopping.admin.businessSettings.erase(connection, {
    settingKey,
  });

  // 4. Attempt to delete again to verify it errors (delete is irreversible and not idempotent)
  await TestValidator.error(
    "Deleting the same business setting twice should fail",
    async () => {
      await api.functional.shopping.admin.businessSettings.erase(connection, {
        settingKey,
      });
    },
  );
}
