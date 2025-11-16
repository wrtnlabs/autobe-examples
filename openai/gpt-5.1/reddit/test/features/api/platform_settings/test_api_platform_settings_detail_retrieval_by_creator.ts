import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_settings_detail_retrieval_by_creator(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/join",
    referrer: "https://landing.example.com/platform-admin",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create a new platform setting as this admin
  const uniqueKeySuffix = RandomGenerator.alphaNumeric(8);
  const settingCreateBody = {
    key: `test.setting.${uniqueKeySuffix}`,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(createdSetting);

  // Basic sanity checks on created DTO
  await TestValidator.predicate("created setting has non-empty id", () => {
    return (
      typeof createdSetting.id === "string" && createdSetting.id.length > 0
    );
  });

  // 3. Retrieve the setting details by id using the same admin context
  const fetchedSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.at(
      connection,
      {
        platformSettingId: createdSetting.id,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(fetchedSetting);

  // 4. Validate round-trip integrity between create and detail retrieval
  //    All exposed fields should be identical because there was no mutation
  TestValidator.equals(
    "platform setting detail matches created record (id)",
    fetchedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "platform setting detail matches created record (key)",
    fetchedSetting.key,
    createdSetting.key,
  );
  TestValidator.equals(
    "platform setting detail matches created record (value)",
    fetchedSetting.value,
    createdSetting.value,
  );
  TestValidator.equals(
    "platform setting detail matches created record (description)",
    fetchedSetting.description,
    createdSetting.description,
  );
  TestValidator.equals(
    "platform setting detail matches created record (is_active)",
    fetchedSetting.is_active,
    createdSetting.is_active,
  );
  TestValidator.equals(
    "platform setting detail matches created record (created_at)",
    fetchedSetting.created_at,
    createdSetting.created_at,
  );
  TestValidator.equals(
    "platform setting detail matches created record (updated_at)",
    fetchedSetting.updated_at,
    createdSetting.updated_at,
  );

  // deleted_at is optional/nullable; just ensure structural equality as well
  TestValidator.equals(
    "platform setting detail matches created record (deleted_at)",
    fetchedSetting.deleted_at ?? null,
    createdSetting.deleted_at ?? null,
  );
}
