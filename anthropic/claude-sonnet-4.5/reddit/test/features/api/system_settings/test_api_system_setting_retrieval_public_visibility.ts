import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test administrator retrieval of system settings with different visibility
 * levels.
 *
 * This test validates that administrators can retrieve system settings and
 * properly distinguish between public and internal-only settings using the
 * is_public flag. The scenario creates system settings with different
 * visibility levels - some marked as public (safe to expose via API) and others
 * marked as internal-only (sensitive configuration like API keys or security
 * parameters). Then it retrieves these settings to verify that the is_public
 * flag correctly indicates the visibility level of each setting.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as an administrator
 * 2. Create a public system setting (e.g., site configuration that can be exposed)
 * 3. Create an internal-only system setting (e.g., sensitive API configuration)
 * 4. Retrieve the public setting and verify is_public is true
 * 5. Retrieve the internal setting and verify is_public is false
 * 6. Validate that both settings contain correct data and proper metadata
 */
export async function test_api_system_setting_retrieval_public_visibility(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a public system setting (safe to expose via API)
  const publicSettingData = {
    key: `site_${RandomGenerator.alphaNumeric(8)}`,
    value: "enabled",
    description: "Public site configuration parameter",
    value_type: "string",
    category: "content",
    is_public: true,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const publicSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: publicSettingData,
    });
  typia.assert(publicSetting);

  // Step 3: Create an internal-only system setting (sensitive configuration)
  const internalSettingData = {
    key: `api_key_${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.alphaNumeric(32),
    description: "Internal API key for external service",
    value_type: "string",
    category: "security",
    is_public: false,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const internalSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: internalSettingData,
    });
  typia.assert(internalSetting);

  // Step 4: Retrieve the public setting and verify is_public is true
  const retrievedPublicSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: publicSetting.id,
    });
  typia.assert(retrievedPublicSetting);

  TestValidator.equals(
    "public setting ID matches",
    retrievedPublicSetting.id,
    publicSetting.id,
  );
  TestValidator.equals(
    "public setting key matches",
    retrievedPublicSetting.key,
    publicSettingData.key,
  );
  TestValidator.equals(
    "public setting value matches",
    retrievedPublicSetting.value,
    publicSettingData.value,
  );
  TestValidator.equals(
    "public setting is_public flag is true",
    retrievedPublicSetting.is_public,
    true,
  );

  // Step 5: Retrieve the internal setting and verify is_public is false
  const retrievedInternalSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: internalSetting.id,
    });
  typia.assert(retrievedInternalSetting);

  TestValidator.equals(
    "internal setting ID matches",
    retrievedInternalSetting.id,
    internalSetting.id,
  );
  TestValidator.equals(
    "internal setting key matches",
    retrievedInternalSetting.key,
    internalSettingData.key,
  );
  TestValidator.equals(
    "internal setting value matches",
    retrievedInternalSetting.value,
    internalSettingData.value,
  );
  TestValidator.equals(
    "internal setting is_public flag is false",
    retrievedInternalSetting.is_public,
    false,
  );

  // Step 6: Validate metadata for both settings
  TestValidator.equals(
    "public setting category matches",
    retrievedPublicSetting.category,
    publicSettingData.category,
  );
  TestValidator.equals(
    "internal setting category matches",
    retrievedInternalSetting.category,
    internalSettingData.category,
  );
  TestValidator.equals(
    "public setting value_type matches",
    retrievedPublicSetting.value_type,
    publicSettingData.value_type,
  );
  TestValidator.equals(
    "internal setting value_type matches",
    retrievedInternalSetting.value_type,
    internalSettingData.value_type,
  );
}
