import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that an inactive platform setting remains fully retrievable by a
 * platform administrator through the detail endpoint.
 *
 * Business intent:
 *
 * - Ensure that `is_active=false` does not prevent administrators from loading a
 *   setting for review, audit, or staging purposes.
 * - Confirm that the detail endpoint faithfully returns the full
 *   `ICommunityPlatformPlatformSetting` record for inactive entries.
 *
 * Steps:
 *
 * 1. Register a new platform admin and establish an authenticated session.
 * 2. Create a new platform setting with `is_active=false` and a clearly marked
 *    test description.
 * 3. Retrieve the setting via the detail endpoint using its `id`.
 * 4. Verify that the record is returned successfully and that `is_active` remains
 *    `false` with all key fields matching those from creation.
 */
export async function test_api_platform_settings_detail_retrieval_for_inactive_setting(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and authenticate
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional; leave undefined to let backend derive it if needed
    href: "https://admin.console.example.com/platform-settings/join",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an inactive platform setting
  const settingKey = `e2e.inactive_setting_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    key: settingKey,
    value: '{"threshold":10,"mode":"test"}',
    description:
      "E2E inactive test configuration: validating retrieval of is_active=false entries.",
    is_active: false,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdSetting);

  // Basic field consistency assertions for created setting
  TestValidator.equals(
    "created setting key should match request body key",
    createdSetting.key,
    createBody.key,
  );
  TestValidator.equals(
    "created setting value should match request body value",
    createdSetting.value,
    createBody.value,
  );
  TestValidator.equals(
    "created setting description should match request body description",
    createdSetting.description,
    createBody.description,
  );
  TestValidator.equals(
    "created setting must be inactive (is_active=false)",
    createdSetting.is_active,
    false,
  );

  // 3. Retrieve the setting via detail endpoint
  const fetchedSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.at(
      connection,
      {
        platformSettingId: createdSetting.id,
      },
    );
  typia.assert(fetchedSetting);

  // 4. Verify that the inactive setting is retrievable and unchanged
  TestValidator.equals(
    "fetched setting id should equal created setting id",
    fetchedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "fetched setting key should equal created setting key",
    fetchedSetting.key,
    createdSetting.key,
  );
  TestValidator.equals(
    "fetched setting value should equal created setting value",
    fetchedSetting.value,
    createdSetting.value,
  );
  TestValidator.equals(
    "fetched setting description should equal created setting description",
    fetchedSetting.description,
    createdSetting.description,
  );
  TestValidator.equals(
    "fetched setting must remain inactive (is_active=false)",
    fetchedSetting.is_active,
    false,
  );
}
