import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that platform-wide settings enforce unique configuration keys.
 *
 * Business goal:
 *
 * - Ensure that creating a platform setting with a duplicate key is rejected,
 *   preventing accidental overwrites of critical configuration keys.
 *
 * Scenario:
 *
 * 1. Register a platform administrator through /auth/platformAdmin/join to obtain
 *    an authenticated admin context.
 * 2. Create a new platform setting via
 *    /communityPlatform/platformAdmin/platformSettings with a specific key.
 * 3. Confirm that the first creation succeeds and mirrors the request payload for
 *    key, value, description, and is_active.
 * 4. Attempt to create another platform setting using the exact same key but with
 *    different value/description.
 * 5. Expect the second creation attempt to fail (business-level uniqueness
 *    enforcement), verified via TestValidator.error without depending on a
 *    specific HTTP status code.
 */
export async function test_api_platform_settings_creation_unique_key_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain authorized context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  await TestValidator.predicate(
    "platform admin join should provide access token",
    async () => admin.token.access.length > 0,
  );

  // 2. Create an initial platform setting with a unique key.
  const settingKey = "karma.community_creation_threshold.test_dup";

  const firstSettingBody = {
    key: settingKey,
    value: "10",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const firstSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: firstSettingBody,
      },
    );
  typia.assert(firstSetting);

  // Ensure created setting reflects the input payload for key, value,
  // description, and is_active.
  TestValidator.equals(
    "created setting key should match request",
    firstSetting.key,
    firstSettingBody.key,
  );
  TestValidator.equals(
    "created setting value should match request",
    firstSetting.value,
    firstSettingBody.value,
  );
  TestValidator.equals(
    "created setting description should match request",
    firstSetting.description,
    firstSettingBody.description,
  );
  TestValidator.equals(
    "created setting active flag should match request",
    firstSetting.is_active,
    firstSettingBody.is_active,
  );

  // 3. Attempt to create another setting with the same key but different value
  //    and description, expecting a uniqueness violation error.
  const secondSettingBody = {
    key: settingKey,
    value: "20",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  await TestValidator.error(
    "creating a platform setting with duplicate key should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformSettings.create(
        connection,
        {
          body: secondSettingBody,
        },
      );
    },
  );
}
