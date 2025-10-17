import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that administrators can successfully retrieve a specific system setting
 * by its unique identifier.
 *
 * This test validates the complete workflow of system configuration management,
 * starting with admin authentication, creating a new system setting with
 * specific configuration parameters, and then retrieving that setting to verify
 * all fields are correctly returned.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as administrator
 * 2. Create a new system setting with configuration parameters
 * 3. Retrieve the created system setting by its ID
 * 4. Validate that all fields match between created and retrieved settings
 */
export async function test_api_system_setting_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a new system setting with configuration parameters
  const settingKey = "max_post_length";
  const settingValue = "10000";
  const settingDescription = "Maximum allowed length for post content";
  const settingValueType = "int";
  const settingCategory = "content";
  const settingIsPublic = false;

  const createdSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: settingKey,
        value: settingValue,
        description: settingDescription,
        value_type: settingValueType,
        category: settingCategory,
        is_public: settingIsPublic,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(createdSetting);

  // Step 3: Retrieve the created system setting by its ID
  const retrievedSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: createdSetting.id,
    });
  typia.assert(retrievedSetting);

  // Step 4: Validate that all fields match between created and retrieved settings
  TestValidator.equals(
    "retrieved setting ID matches created setting",
    retrievedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "retrieved setting key matches created setting",
    retrievedSetting.key,
    createdSetting.key,
  );
  TestValidator.equals(
    "retrieved setting value matches created setting",
    retrievedSetting.value,
    createdSetting.value,
  );
  TestValidator.equals(
    "retrieved setting description matches created setting",
    retrievedSetting.description,
    createdSetting.description,
  );
  TestValidator.equals(
    "retrieved setting value_type matches created setting",
    retrievedSetting.value_type,
    createdSetting.value_type,
  );
  TestValidator.equals(
    "retrieved setting category matches created setting",
    retrievedSetting.category,
    createdSetting.category,
  );
  TestValidator.equals(
    "retrieved setting is_public matches created setting",
    retrievedSetting.is_public,
    createdSetting.is_public,
  );
  TestValidator.equals(
    "retrieved setting created_at matches created setting",
    retrievedSetting.created_at,
    createdSetting.created_at,
  );
  TestValidator.equals(
    "retrieved setting updated_at matches created setting",
    retrievedSetting.updated_at,
    createdSetting.updated_at,
  );
}
