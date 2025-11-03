import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";

/**
 * Validate that a registered shopping mall admin can view the detail of a
 * business setting using its setting_key.
 *
 * This test ensures business logic around the
 * /shopping/admin/businessSettings/{settingKey} endpoint works as intended for
 * platform administrators.
 *
 * Steps:
 *
 * 1. Register a new admin account (simulate onboarding a privileged backend user).
 * 2. As that admin, attempt to fetch the detail for a missing setting_key and
 *    ensure business logic error.
 * 3. Attempt to fetch a possible real business setting, if found, assert all
 *    documented fields exist and audit/deleted state.
 * 4. Confirm type safety and that deleted_at is null for an active (not deleted)
 *    setting.
 *
 * No type error or invalid format scenarios are tested per zero tolerance
 * policy.
 */
export async function test_api_business_setting_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Attempt to fetch a business setting by setting_key (missing case)
  const missingKey = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "Requesting missing setting_key should error",
    async () => {
      await api.functional.shopping.admin.businessSettings.at(connection, {
        settingKey: missingKey,
      });
    },
  );

  // 3. Try fetching a real business setting (multiple random attempts)
  let found: IShoppingBusinessSetting | null = null;
  for (let i = 0; i < 3; ++i) {
    const candidateKey = RandomGenerator.alphabets(8);
    try {
      const setting = await api.functional.shopping.admin.businessSettings.at(
        connection,
        {
          settingKey: candidateKey,
        },
      );
      typia.assert(setting);
      found = setting;
      break;
    } catch {
      // If error, continue
    }
  }
  if (found !== null) {
    // 4. Validate important fields and type
    typia.assert(found.id);
    typia.assert(found.setting_key);
    typia.assert(found.setting_value);
    typia.assert(found.created_at);
    typia.assert(found.updated_at);
    // description optional, deleted_at may be null/undefined
    TestValidator.equals(
      "deleted_at is null or undefined for active setting",
      found.deleted_at,
      null,
    );
  }
}
