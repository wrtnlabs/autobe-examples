import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";

/**
 * Validates that an administrator can successfully update an existing platform
 * setting via /communityPlatform/admin/settings/{settingKey}.
 *
 * 1. Register as an administrator using the join endpoint.
 * 2. Prepare an existing settingKey and create a plausible
 *    ICommunityPlatformSettings.IUpdate payload.
 * 3. Call the update endpoint as admin and check that the result reflects the new
 *    values (value, type, description, is_active).
 * 4. Attempt update as unauthenticated (unauthorized) user and verify error.
 * 5. Attempt update with a non-existent settingKey and verify error.
 */
export async function test_api_update_platform_setting_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminHref = "https://testadmin.domain/join";
  const adminReferrer = "https://testadmin.domain/landing";
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. SettingKey and initial existing setting
  const settingKey = RandomGenerator.alphaNumeric(10);
  const initialUpdateBody = {
    value: "10",
    type: "int",
    description: "Initial setting description for test",
    is_active: true,
  } satisfies ICommunityPlatformSettings.IUpdate;
  // Create existing setting (as a hack, first update it to create if backend allows)
  const existingSetting =
    await api.functional.communityPlatform.admin.settings.update(connection, {
      settingKey,
      body: initialUpdateBody,
    });
  typia.assert(existingSetting);
  TestValidator.equals(
    "created platform setting key matches",
    existingSetting.setting_key,
    settingKey,
  );
  TestValidator.equals(
    "platform setting value",
    existingSetting.value,
    initialUpdateBody.value,
  );
  TestValidator.equals(
    "platform setting type",
    existingSetting.type,
    initialUpdateBody.type,
  );
  TestValidator.equals(
    "platform setting description",
    existingSetting.description,
    initialUpdateBody.description,
  );
  TestValidator.equals(
    "platform setting active state",
    existingSetting.is_active,
    initialUpdateBody.is_active,
  );

  // 3. Update platform setting as admin
  const updateBody = {
    value: "25",
    type: "int",
    description: "Updated description for platform ops.",
    is_active: false,
  } satisfies ICommunityPlatformSettings.IUpdate;
  const updated = await api.functional.communityPlatform.admin.settings.update(
    connection,
    {
      settingKey,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated platform setting key matches",
    updated.setting_key,
    settingKey,
  );
  TestValidator.equals(
    "updated value after update",
    updated.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated type after update",
    updated.type,
    updateBody.type,
  );
  TestValidator.equals(
    "updated description after update",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated is_active after update",
    updated.is_active,
    updateBody.is_active,
  );

  // 4. Cannot update as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update platform setting",
    async () => {
      await api.functional.communityPlatform.admin.settings.update(unauthConn, {
        settingKey,
        body: updateBody,
      });
    },
  );

  // 5. Fails for non-existent settingKey
  await TestValidator.error(
    "update fails with invalid settingKey",
    async () => {
      await api.functional.communityPlatform.admin.settings.update(connection, {
        settingKey: "nonexistent_" + RandomGenerator.alphaNumeric(7),
        body: updateBody,
      });
    },
  );
}
