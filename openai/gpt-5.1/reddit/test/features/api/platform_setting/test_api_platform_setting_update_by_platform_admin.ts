import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_setting_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin (join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an initial platform setting as this admin
  const initialKey = `karma.threshold.${RandomGenerator.alphabets(6)}`;
  const initialValue = "100";
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createBody = {
    key: initialKey,
    value: initialValue,
    description: initialDescription,
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const created: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Update the platform setting with new business values
  const updatedKey = `${initialKey}.v2`;
  const updatedValue = "250";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 7 });
  const updatedIsActive = false;

  const updateBody = {
    key: updatedKey,
    value: updatedValue,
    description: updatedDescription,
    is_active: updatedIsActive,
  } satisfies ICommunityPlatformPlatformSetting.IUpdate;

  const updated: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.update(
      connection,
      {
        platformSettingId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business assertions
  // 4-1. Identity must be preserved
  TestValidator.equals(
    "platform setting ID is unchanged after update",
    updated.id,
    created.id,
  );

  // 4-2. Key should reflect updated value
  TestValidator.equals(
    "platform setting key is updated",
    updated.key,
    updatedKey,
  );

  // 4-3. Value, description, and is_active must be updated
  TestValidator.equals(
    "platform setting value is updated",
    updated.value,
    updatedValue,
  );

  TestValidator.equals(
    "platform setting description is updated",
    updated.description,
    updatedDescription,
  );

  TestValidator.equals(
    "platform setting is_active is updated",
    updated.is_active,
    updatedIsActive,
  );

  // 4-4. created_at must remain unchanged
  TestValidator.equals(
    "platform setting created_at remains unchanged after update",
    updated.created_at,
    created.created_at,
  );

  // 4-5. updated_at must change and should be later than original
  TestValidator.notEquals(
    "platform setting updated_at changes after update",
    updated.updated_at,
    created.updated_at,
  );

  TestValidator.predicate(
    "platform setting updated_at is lexicographically greater than original",
    updated.updated_at > created.updated_at,
  );
}
