import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate minimal creation of a platform-wide configuration setting by a
 * platform admin.
 *
 * Business workflow:
 *
 * 1. Register a new platform administrator via auth.platformAdmin.join to obtain
 *    JWT tokens and implicitly configure the connection for
 *    platformAdmin-authenticated calls.
 * 2. Using the authenticated connection, call
 *    communityPlatform.platformAdmin.platformSettings.create with a minimal but
 *    valid ICommunityPlatformPlatformSetting.ICreate payload containing:
 *
 *    - Key: unique, well-formed configuration key string
 *    - Value: serialized configuration value string (e.g., numeric threshold as
 *         text)
 *    - Description: human-readable explanation of the setting and its effect
 *    - Is_active: true to immediately activate the setting.
 * 3. Assert that the created ICommunityPlatformPlatformSetting echoes back the
 *    client-supplied metadata and that server-populated fields (id, created_at,
 *    updated_at, deleted_at) reflect a non-deleted active row.
 */
export async function test_api_platform_settings_creation_minimal_valid_payload(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to gain platformAdmin authorization
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare minimal but valid platform setting creation payload
  const settingKey = `voting.max_votes_per_hour.${RandomGenerator.alphaNumeric(6)}`;
  const settingValue = "100"; // realistic serialized numeric threshold as string
  const settingDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });

  const createBody = {
    key: settingKey,
    value: settingValue,
    description: settingDescription,
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

  // 3. Business-level validations on returned setting
  // 3-1. id should be non-empty UUID-like string (typia.assert already ensured format, we just check non-empty)
  TestValidator.predicate(
    "created setting id should be a non-empty string",
    created.id.length > 0,
  );

  // 3-2. Echo back of client-supplied metadata
  TestValidator.equals(
    "platform setting key should match request payload",
    created.key,
    createBody.key,
  );
  TestValidator.equals(
    "platform setting value should match request payload",
    created.value,
    createBody.value,
  );
  TestValidator.equals(
    "platform setting description should match request payload",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "platform setting is_active should match request payload",
    created.is_active,
    createBody.is_active,
  );

  // 3-3. created_at and updated_at should be non-empty ISO strings
  TestValidator.predicate(
    "created_at should be a non-empty timestamp string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty timestamp string",
    created.updated_at.length > 0,
  );

  // 3-4. deleted_at must represent a non-deleted row: either null or undefined
  TestValidator.predicate(
    "deleted_at should indicate non-deleted (null or undefined)",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 3-5. Logical assertion: active settings should be treated as available (no extra API calls)
  TestValidator.predicate(
    "is_active=true implies the setting is logically available for use",
    created.is_active === true,
  );
}
