import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunitySystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSettings";

export async function test_api_reddit_community_system_setting_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the system
  const adminCreateBody = {
    email: `admin.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "securePassword123",
  } satisfies IRedditCommunityAdmin.ICreate;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a unique system setting to be deleted
  const settingName = `test_setting_${RandomGenerator.alphaNumeric(6)}`;
  const settingCreateBody = {
    name: settingName,
    value: `value_${RandomGenerator.alphaNumeric(10)}`,
    description: "Temporary system setting for deletion test",
  } satisfies IRedditCommunitySystemSettings.ICreate;

  const createdSetting: IRedditCommunitySystemSettings =
    await api.functional.redditCommunity.admin.redditCommunitySystemSettings.create(
      connection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "created setting name",
    createdSetting.name,
    settingCreateBody.name,
  );
  TestValidator.equals(
    "created setting value",
    createdSetting.value,
    settingCreateBody.value,
  );
  TestValidator.equals(
    "created setting description",
    createdSetting.description ?? null,
    settingCreateBody.description,
  );

  // 3. Delete the created system setting by unique name
  await api.functional.redditCommunity.admin.redditCommunitySystemSettings.erase(
    connection,
    {
      name: settingName,
    },
  );

  // Since delete endpoint returns void, to verify deletion, simulate by trying to delete again and expect an error
  await TestValidator.error(
    "should error when deleting the same system setting again",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunitySystemSettings.erase(
        connection,
        {
          name: settingName,
        },
      );
    },
  );
}
