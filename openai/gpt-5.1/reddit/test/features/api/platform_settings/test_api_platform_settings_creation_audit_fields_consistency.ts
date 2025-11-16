import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate audit field consistency when creating platform settings.
 *
 * Business goal
 *
 * - Ensure that when a new platform-wide configuration setting is created by a
 *   platform administrator, the audit fields (created_at, updated_at,
 *   deleted_at) are initialized correctly and consistently.
 * - Confirm that newly created settings are not soft-deleted and that each row
 *   gets its own timestamps and id.
 *
 * Steps
 *
 * 1. Register and authenticate a platform administrator using the join endpoint.
 * 2. Create the first platform setting using a realistic key and configuration
 *    payload.
 * 3. Verify that:
 *
 *    - Created_at and updated_at exist and are valid ISO date-time strings.
 *    - Created_at and updated_at are equal for a freshly created row.
 *    - Deleted_at is null or undefined (row is not soft-deleted).
 * 4. Create a second platform setting with a different key.
 * 5. Verify that:
 *
 *    - The second setting has a different id from the first.
 *    - Its created_at and updated_at are valid date-times and equal to each other.
 *    - Its deleted_at is null or undefined.
 *    - Its timestamps differ from the first setting, proving per-row audit
 *         initialization.
 * 6. Additionally confirm that non-audit fields (key, value, description,
 *    is_active) are echoed as provided in the request bodies.
 */
export async function test_api_platform_settings_creation_audit_fields_consistency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.community-platform.test/register",
    referrer: "https://admin.community-platform.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create the first platform setting
  const firstSettingBody = {
    key: "voting.max_votes_per_hour",
    value: "100",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
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

  // Basic field echo validation for first setting
  TestValidator.equals(
    "first setting key should echo request key",
    firstSetting.key,
    firstSettingBody.key,
  );
  TestValidator.equals(
    "first setting value should echo request value",
    firstSetting.value,
    firstSettingBody.value,
  );
  TestValidator.equals(
    "first setting description should echo request description",
    firstSetting.description,
    firstSettingBody.description,
  );
  TestValidator.equals(
    "first setting is_active should echo request is_active",
    firstSetting.is_active,
    firstSettingBody.is_active,
  );

  // 3. Audit field validation for first setting
  TestValidator.predicate(
    "first setting created_at must be a non-empty string",
    typeof firstSetting.created_at === "string" &&
      firstSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "first setting updated_at must be a non-empty string",
    typeof firstSetting.updated_at === "string" &&
      firstSetting.updated_at.length > 0,
  );

  // created_at and updated_at should be identical for a brand new row
  TestValidator.equals(
    "first setting created_at and updated_at should match",
    firstSetting.created_at,
    firstSetting.updated_at,
  );

  // deleted_at must represent a non-deleted row (null or undefined)
  TestValidator.predicate(
    "first setting deleted_at must be null or undefined",
    firstSetting.deleted_at === null || firstSetting.deleted_at === undefined,
  );

  // 4. Create a second platform setting with a different key
  const secondSettingBody = {
    key: "karma.community_creation_threshold",
    value: "250",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const secondSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: secondSettingBody,
      },
    );
  typia.assert(secondSetting);

  // Basic field echo validation for second setting
  TestValidator.equals(
    "second setting key should echo request key",
    secondSetting.key,
    secondSettingBody.key,
  );
  TestValidator.equals(
    "second setting value should echo request value",
    secondSetting.value,
    secondSettingBody.value,
  );
  TestValidator.equals(
    "second setting description should echo request description",
    secondSetting.description,
    secondSettingBody.description,
  );
  TestValidator.equals(
    "second setting is_active should echo request is_active",
    secondSetting.is_active,
    secondSettingBody.is_active,
  );

  // 5. Audit field validation for second setting
  TestValidator.predicate(
    "second setting created_at must be a non-empty string",
    typeof secondSetting.created_at === "string" &&
      secondSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "second setting updated_at must be a non-empty string",
    typeof secondSetting.updated_at === "string" &&
      secondSetting.updated_at.length > 0,
  );

  TestValidator.equals(
    "second setting created_at and updated_at should match",
    secondSetting.created_at,
    secondSetting.updated_at,
  );

  TestValidator.predicate(
    "second setting deleted_at must be null or undefined",
    secondSetting.deleted_at === null || secondSetting.deleted_at === undefined,
  );

  // 6. Cross-row audit consistency checks
  TestValidator.notEquals(
    "each platform setting must have a distinct id",
    firstSetting.id,
    secondSetting.id,
  );

  TestValidator.notEquals(
    "created_at timestamps of two different settings should differ",
    firstSetting.created_at,
    secondSetting.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamps of two different settings should differ",
    firstSetting.updated_at,
    secondSetting.updated_at,
  );
}
