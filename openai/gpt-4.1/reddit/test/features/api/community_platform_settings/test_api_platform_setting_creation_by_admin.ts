import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";

/**
 * Validates creation of a new global community platform setting by an
 * authenticated admin user.
 *
 * 1. Authenticate as a platform admin with the join endpoint.
 * 2. Create a new unique setting with all required fields.
 * 3. Validate that the response matches the input and contains proper metadata
 *    fields (id, created_at, etc).
 * 4. Test that creation without admin authentication is forbidden.
 * 5. Test that creation with a duplicate setting_key fails.
 */
export async function test_api_platform_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: `https://admin-portal.${RandomGenerator.alphabets(8)}.com`,
    referrer: `https://referrer.${RandomGenerator.alphabets(4)}.com`,
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. Create a new unique setting
  const uniqueKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const settingBody = {
    setting_key: uniqueKey,
    value: "50",
    type: RandomGenerator.pick(["int", "text", "boolean", "enum"] as const),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_active: true,
  } satisfies ICommunityPlatformSettings.ICreate;
  const createdSetting =
    await api.functional.communityPlatform.admin.settings.create(connection, {
      body: settingBody,
    });
  typia.assert(createdSetting);

  TestValidator.equals(
    "setting key matches",
    createdSetting.setting_key,
    settingBody.setting_key,
  );
  TestValidator.equals(
    "setting value matches",
    createdSetting.value,
    settingBody.value,
  );
  TestValidator.equals(
    "setting type matches",
    createdSetting.type,
    settingBody.type,
  );
  TestValidator.equals(
    "setting description matches",
    createdSetting.description,
    settingBody.description,
  );
  TestValidator.equals(
    "is_active flag matches",
    createdSetting.is_active,
    settingBody.is_active,
  );

  TestValidator.predicate(
    "id is uuid",
    typeof createdSetting.id === "string" && createdSetting.id.length === 36,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof createdSetting.created_at === "string" &&
      createdSetting.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof createdSetting.updated_at === "string" &&
      createdSetting.updated_at.includes("T"),
  );

  // 3. Unauthenticated attempt (should fail)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should reject setting creation without authenticated admin",
    async () => {
      await api.functional.communityPlatform.admin.settings.create(
        unauthConnection,
        { body: settingBody },
      );
    },
  );
  // 4. Duplicate key attempt (should fail)
  await TestValidator.error(
    "should prevent creation of duplicate setting_key",
    async () => {
      await api.functional.communityPlatform.admin.settings.create(connection, {
        body: settingBody,
      });
    },
  );
}
