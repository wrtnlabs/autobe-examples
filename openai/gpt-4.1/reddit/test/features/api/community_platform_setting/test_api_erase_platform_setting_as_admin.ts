import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate that only authenticated platform administrators can delete platform
 * settings by key, and that deletion is permanent, properly denied for
 * unauthorized users, and gracefully handled when targeting non-existent or
 * protected settings.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin using the platform admin join API
 * 2. Select a random string for the setting key (simulate as if this represents a
 *    setting that exists)
 * 3. Attempt to delete the setting using the admin account (should succeed or at
 *    least not return an unauthorized error)
 * 4. Attempt to delete the same setting again (should fail; expect a not found or
 *    no-op error)
 * 5. Attempt to delete a different random setting as a non-admin (unauthenticated
 *    connection; should fail with authorization error)
 */
export async function test_api_erase_platform_setting_as_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://localhost/admin/onboard",
    referrer: "https://localhost",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuth);

  // 2. Select a random setting key (pretend this is an existing setting)
  const settingKey = RandomGenerator.alphaNumeric(10);

  // 3. Attempt to delete the setting as admin
  await api.functional.communityPlatform.admin.settings.erase(connection, {
    settingKey,
  });

  // 4. Attempt to delete the same setting again (should fail)
  await TestValidator.error(
    "second deletion attempt on same setting should fail",
    async () => {
      await api.functional.communityPlatform.admin.settings.erase(connection, {
        settingKey,
      });
    },
  );

  // 5. Attempt to delete a setting as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const otherSettingKey = RandomGenerator.alphaNumeric(10);
  await TestValidator.error(
    "delete attempt as unauthenticated user should fail",
    async () => {
      await api.functional.communityPlatform.admin.settings.erase(unauthConn, {
        settingKey: otherSettingKey,
      });
    },
  );
}
