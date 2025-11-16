import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunitySystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSettings";

export async function test_api_redditcommunity_admin_redditcommunitysystemsettings_create_new_setting(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a unique reddit community system setting
  const settingName = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const settingValue = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const settingDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 12,
  });

  const createdSetting: IRedditCommunitySystemSettings =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.create(
      connection,
      {
        body: {
          name: settingName,
          value: settingValue,
          description: settingDescription,
        } satisfies IRedditCommunitySystemSettings.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "created setting name",
    createdSetting.name,
    settingName,
  );
  TestValidator.equals(
    "created setting value",
    createdSetting.value,
    settingValue,
  );
  TestValidator.equals(
    "created setting description",
    createdSetting.description ?? null,
    settingDescription,
  );

  // 3. Attempt to create a duplicate setting with the same name, expect error
  await TestValidator.error("duplicate setting name should fail", async () => {
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.create(
      connection,
      {
        body: {
          name: settingName,
          value: "some other value",
        } satisfies IRedditCommunitySystemSettings.ICreate,
      },
    );
  });
}
