import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that updating a platform setting's key to an already-used key is
 * rejected by the backend's unique key constraint.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator via auth.platformAdmin.join, which also
 *    establishes an authenticated context through JWT headers.
 * 2. As that admin, create a first platform setting with a fixed key
 *    "config.key.primary".
 * 3. Create a second setting with a different key "config.key.secondary".
 * 4. Attempt to update the second setting so that its key becomes
 *    "config.key.primary", colliding with the first setting's key.
 * 5. Confirm that the update operation fails (throws), indicating that the unique
 *    constraint on key is enforced for updates.
 * 6. Sanity check in-memory objects so that the original keys on the first and
 *    second settings remain as initially created.
 */
export async function test_api_platform_setting_update_key_uniqueness_conflict(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create the first platform setting with key "config.key.primary"
  const primaryCreateBody = {
    key: "config.key.primary",
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const primarySetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: primaryCreateBody,
      },
    );
  typia.assert(primarySetting);

  TestValidator.equals(
    "primary setting key should be config.key.primary",
    primarySetting.key,
    "config.key.primary",
  );

  // 3. Create a second distinct setting with key "config.key.secondary"
  const secondaryCreateBody = {
    key: "config.key.secondary",
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const secondarySetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: secondaryCreateBody,
      },
    );
  typia.assert(secondarySetting);

  TestValidator.equals(
    "secondary setting key should be config.key.secondary",
    secondarySetting.key,
    "config.key.secondary",
  );

  TestValidator.notEquals(
    "primary and secondary settings must have different ids",
    primarySetting.id,
    secondarySetting.id,
  );

  TestValidator.notEquals(
    "primary and secondary settings must have different keys",
    primarySetting.key,
    secondarySetting.key,
  );

  // 4. Attempt to update the second setting's key to collide with primary key
  await TestValidator.error(
    "updating setting key to an existing key should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformSettings.update(
        connection,
        {
          platformSettingId: secondarySetting.id,
          body: {
            key: "config.key.primary",
          } satisfies ICommunityPlatformPlatformSetting.IUpdate,
        },
      );
    },
  );

  // 5. Sanity-check that our in-memory settings still reflect their
  // original keys; this cannot prove persistence but guards against
  // accidental mutations within the test.
  TestValidator.equals(
    "primary setting key remains config.key.primary",
    primarySetting.key,
    "config.key.primary",
  );

  TestValidator.equals(
    "secondary setting key remains config.key.secondary in memory",
    secondarySetting.key,
    "config.key.secondary",
  );
}
