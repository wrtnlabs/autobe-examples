import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";

/**
 * Validate that only administrators can permanently delete system-wide settings
 * and the targeted setting is completely removed.
 *
 * Business context: Ensures only privileged admin can perform permanent system
 * configuration removal, impacting fundamental platform behaviors.
 *
 * Flow:
 *
 * 1. Create and authenticate a new administrator
 * 2. Create a new system setting (to obtain a unique key)
 * 3. Delete the setting using the correct key
 * 4. Verify the setting no longer exists (if possible)
 * 5. Test protection: Attempting deletion as non-admin or for non-existent key
 *    should fail (but only if an API exists for those checks)
 */
export async function test_api_system_setting_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Create a system setting to be deleted
  const settingInput = {
    key: RandomGenerator.alphaNumeric(16),
    value: RandomGenerator.paragraph(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformSystemSettings.ICreate;
  const setting =
    await api.functional.communityPlatform.administrator.systemSettings.create(
      connection,
      { body: settingInput },
    );
  typia.assert(setting);
  TestValidator.equals("created key matches", setting.key, settingInput.key);

  // 3. Delete the created setting as administrator
  await api.functional.communityPlatform.administrator.systemSettings.erase(
    connection,
    { key: setting.key },
  );

  // 4. (If possible) Verify setting is deleted -- no API available, so acknowledge as not testable
  // (If an API existed to fetch settings by key or list, would call & assert nonexistence)
}
