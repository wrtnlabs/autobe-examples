import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_settings_detail_after_multiple_creations(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and establish authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/signup",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two distinct platform settings
  const settingCreateBodyA = {
    key: `voting.threshold.${RandomGenerator.alphaNumeric(6)}`,
    value: "10",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const settingCreateBodyB = {
    key: `karma.rule.${RandomGenerator.alphaNumeric(6)}`,
    value: "0.75",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: false,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const settingA: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBodyA,
      },
    );
  typia.assert(settingA);

  const settingB: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBodyB,
      },
    );
  typia.assert(settingB);

  // Ensure the two created settings are actually distinct
  TestValidator.notEquals(
    "platform settings must be distinct records (different ids)",
    settingA.id,
    settingB.id,
  );
  TestValidator.notEquals(
    "platform settings must have different keys",
    settingA.key,
    settingB.key,
  );

  // Helper to validate detail response against creation payload
  const assertSettingMatchesCreate = (
    titlePrefix: string,
    created: ICommunityPlatformPlatformSetting,
    createBody: ICommunityPlatformPlatformSetting.ICreate,
    detail: ICommunityPlatformPlatformSetting,
  ): void => {
    // Structural type validation already done via typia.assert before calling this
    TestValidator.equals(
      `${titlePrefix} - id must match requested id`,
      detail.id,
      created.id,
    );
    TestValidator.equals(
      `${titlePrefix} - key must match creation payload`,
      detail.key,
      createBody.key,
    );
    TestValidator.equals(
      `${titlePrefix} - value must match creation payload`,
      detail.value,
      createBody.value,
    );
    TestValidator.equals(
      `${titlePrefix} - description must match creation payload`,
      detail.description,
      createBody.description,
    );
    TestValidator.equals(
      `${titlePrefix} - is_active must match creation payload`,
      detail.is_active,
      createBody.is_active,
    );

    // Newly created settings should not be soft-deleted
    TestValidator.predicate(
      `${titlePrefix} - deleted_at must be null or undefined for newly created setting`,
      detail.deleted_at === null || detail.deleted_at === undefined,
    );
  };

  // 3. Fetch detail for setting A and validate isolation
  const detailA: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.at(
      connection,
      {
        platformSettingId: settingA.id,
      },
    );
  typia.assert(detailA);

  assertSettingMatchesCreate(
    "settingA detail",
    settingA,
    settingCreateBodyA,
    detailA,
  );

  // Ensure that detailA does not accidentally return settingB's key/value
  TestValidator.notEquals(
    "detailA key must not equal settingB key",
    detailA.key,
    settingB.key,
  );
  TestValidator.notEquals(
    "detailA value must not equal settingB value when keys differ",
    detailA.value,
    settingB.value,
  );

  // 4. Fetch detail for setting B and validate isolation
  const detailB: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.at(
      connection,
      {
        platformSettingId: settingB.id,
      },
    );
  typia.assert(detailB);

  assertSettingMatchesCreate(
    "settingB detail",
    settingB,
    settingCreateBodyB,
    detailB,
  );

  // Ensure that detailB does not accidentally return settingA's key/value
  TestValidator.notEquals(
    "detailB key must not equal settingA key",
    detailB.key,
    settingA.key,
  );
  TestValidator.notEquals(
    "detailB value must not equal settingA value when keys differ",
    detailB.value,
    settingA.value,
  );
}
