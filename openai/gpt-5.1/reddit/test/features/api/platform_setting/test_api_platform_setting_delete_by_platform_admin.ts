import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_setting_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a new platform setting as this admin
  const settingKeyPrefix = "e2e.test.platformSetting.delete.";
  const settingKey = `${settingKeyPrefix}${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    key: settingKey,
    value: '{"threshold":10}',
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(createdSetting);

  // Verify the created setting key matches the request
  TestValidator.equals(
    "created platform setting key should match requested key",
    createdSetting.key,
    settingKey,
  );

  // 3. Delete the created platform setting by ID
  await api.functional.communityPlatform.platformAdmin.platformSettings.erase(
    connection,
    {
      platformSettingId: createdSetting.id,
    },
  );

  // 4. Assert that the test flow reached this point after erase without errors
  TestValidator.predicate(
    "platform setting erase completed without throwing",
    true,
  );
}
