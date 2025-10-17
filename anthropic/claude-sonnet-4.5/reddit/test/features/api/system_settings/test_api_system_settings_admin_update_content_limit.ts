import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test administrator's ability to update system configuration settings.
 *
 * This test validates the complete system settings management workflow where
 * administrators modify critical platform parameters like content limits. The
 * test creates an admin account, establishes a new system setting with initial
 * values, then updates that setting with modified configuration to verify the
 * update operation works correctly.
 *
 * Workflow:
 *
 * 1. Create and authenticate administrator account
 * 2. Create initial system setting for content limit control
 * 3. Update the setting with new configuration values
 * 4. Validate updated setting reflects changes correctly
 */
export async function test_api_system_settings_admin_update_content_limit(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create initial system setting
  const initialSettingData = {
    key: "max_post_content_length",
    value: "10000",
    description: "Maximum length of post content in characters",
    value_type: "int",
    category: "content",
    is_public: true,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: initialSettingData,
    });
  typia.assert(createdSetting);

  // Validate initial creation
  TestValidator.equals(
    "setting key matches",
    createdSetting.key,
    initialSettingData.key,
  );
  TestValidator.equals(
    "initial value matches",
    createdSetting.value,
    initialSettingData.value,
  );
  TestValidator.equals(
    "value type matches",
    createdSetting.value_type,
    initialSettingData.value_type,
  );

  // Step 3: Update the system setting with new values
  const updateData = {
    value: "15000",
    description:
      "Updated maximum length of post content in characters - increased limit",
    category: "content_limits",
    is_public: true,
  } satisfies IRedditLikeSystemSetting.IUpdate;

  const updatedSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.update(connection, {
      id: createdSetting.id,
      body: updateData,
    });
  typia.assert(updatedSetting);

  // Step 4: Validate the update operation results
  TestValidator.equals(
    "setting ID unchanged",
    updatedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "setting key unchanged",
    updatedSetting.key,
    createdSetting.key,
  );
  TestValidator.equals(
    "value updated correctly",
    updatedSetting.value,
    updateData.value,
  );
  TestValidator.equals(
    "description updated",
    updatedSetting.description,
    updateData.description,
  );
  TestValidator.equals(
    "category updated",
    updatedSetting.category,
    updateData.category,
  );
  TestValidator.equals(
    "visibility updated",
    updatedSetting.is_public,
    updateData.is_public,
  );
  TestValidator.equals(
    "value type preserved",
    updatedSetting.value_type,
    createdSetting.value_type,
  );

  // Validate timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    new Date(updatedSetting.updated_at).getTime() >=
      new Date(createdSetting.updated_at).getTime(),
  );
}
