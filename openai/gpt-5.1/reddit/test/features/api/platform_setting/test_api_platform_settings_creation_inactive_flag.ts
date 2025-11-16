import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_settings_creation_inactive_flag(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#1234",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Prepare inactive platform setting create payload
  const baseKey = "safety.experimental_flag_x";
  const uniqueSuffix = RandomGenerator.alphabets(6);
  const settingKey = `${baseKey}.${uniqueSuffix}`;

  const createBody = {
    key: settingKey,
    value: "true", // serialized representation for a future boolean toggle
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: false,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  // 3. Call platform settings create API as the authenticated platform admin
  const created =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(created);

  // 4. Business assertions
  // Ensure core fields are echoed correctly
  TestValidator.equals(
    "platform setting key should match request",
    created.key,
    createBody.key,
  );
  TestValidator.equals(
    "platform setting value should match request",
    created.value,
    createBody.value,
  );
  TestValidator.equals(
    "platform setting description should match request",
    created.description,
    createBody.description,
  );

  // is_active must be false for an inactive staged setting
  TestValidator.equals(
    "platform setting must be created as inactive",
    created.is_active,
    false,
  );

  // created_at and updated_at must be present (format already ensured by typia)
  TestValidator.predicate(
    "created_at must be a non-empty string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    created.updated_at.length > 0,
  );

  // For a freshly created setting, deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at must be null or undefined on creation",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // Optionally, newly created settings often have identical created_at/updated_at
  TestValidator.equals(
    "created_at and updated_at should be equal immediately after creation",
    created.created_at,
    created.updated_at,
  );
}
