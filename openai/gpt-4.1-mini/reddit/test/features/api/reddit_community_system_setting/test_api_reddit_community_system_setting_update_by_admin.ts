import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunitySystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSettings";

export async function test_api_reddit_community_system_setting_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration for authentication
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "SecurePass123!";

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a reddit community system setting
  const systemSettingName = `setting_${RandomGenerator.alphaNumeric(10)}`;
  const systemSettingValue = RandomGenerator.alphaNumeric(20);
  const systemSettingDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });

  const createdSetting: IRedditCommunitySystemSettings =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.create(
      connection,
      {
        body: {
          name: systemSettingName,
          value: systemSettingValue,
          description: systemSettingDescription,
        } satisfies IRedditCommunitySystemSettings.ICreate,
      },
    );
  typia.assert(createdSetting);

  TestValidator.equals(
    "created setting name",
    createdSetting.name,
    systemSettingName,
  );
  TestValidator.equals(
    "created setting value",
    createdSetting.value,
    systemSettingValue,
  );
  TestValidator.equals(
    "created setting description",
    createdSetting.description ?? null,
    systemSettingDescription,
  );

  // Step 3: Update the system setting's value and optionally description
  const updatedValue = RandomGenerator.alphaNumeric(25);
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const updatedSetting: IRedditCommunitySystemSettings =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.update(
      connection,
      {
        name: systemSettingName,
        body: {
          value: updatedValue,
          description: updatedDescription,
        } satisfies IRedditCommunitySystemSettings.IUpdate,
      },
    );
  typia.assert(updatedSetting);

  // Step 4: Validate the updated values
  TestValidator.equals(
    "updated setting name",
    updatedSetting.name,
    systemSettingName,
  );
  TestValidator.equals(
    "updated setting value",
    updatedSetting.value,
    updatedValue,
  );
  TestValidator.equals(
    "updated setting description",
    updatedSetting.description ?? null,
    updatedDescription,
  );
}
