import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test administrator ability to update feature toggle system settings.
 *
 * This test validates the complete workflow of modifying boolean-type system
 * settings that control platform feature availability. Feature toggles are
 * critical for managing platform functionality dynamically without code
 * deployments.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as platform administrator
 * 2. Create initial feature toggle setting with enabled state
 * 3. Update the setting to toggle the feature state
 * 4. Verify the setting was updated correctly with new value
 * 5. Confirm feature configuration changes are reflected immediately
 */
export async function test_api_system_settings_admin_update_feature_toggle(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial feature toggle setting with enabled state
  const featureToggleSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: `feature_${RandomGenerator.alphaNumeric(8)}`,
        value: "true",
        description: "Feature toggle for testing update functionality",
        value_type: "boolean",
        category: "features",
        is_public: true,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(featureToggleSetting);

  // Verify initial setting state
  TestValidator.equals(
    "initial feature toggle value should be true",
    featureToggleSetting.value,
    "true",
  );
  TestValidator.equals(
    "value type should be boolean",
    featureToggleSetting.value_type,
    "boolean",
  );

  // Step 3: Update the setting to toggle the feature state
  const updatedSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.update(connection, {
      id: featureToggleSetting.id,
      body: {
        value: "false",
        description: "Updated feature toggle - now disabled",
      } satisfies IRedditLikeSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting);

  // Step 4: Verify the setting was updated correctly
  TestValidator.equals(
    "setting ID should remain the same",
    updatedSetting.id,
    featureToggleSetting.id,
  );
  TestValidator.equals(
    "updated feature toggle value should be false",
    updatedSetting.value,
    "false",
  );
  TestValidator.equals(
    "updated description should match",
    updatedSetting.description,
    "Updated feature toggle - now disabled",
  );
  TestValidator.equals(
    "value type should still be boolean",
    updatedSetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "category should remain unchanged",
    updatedSetting.category,
    featureToggleSetting.category,
  );
  TestValidator.equals(
    "public visibility should remain unchanged",
    updatedSetting.is_public,
    featureToggleSetting.is_public,
  );

  // Step 5: Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp should be after created_at",
    new Date(updatedSetting.updated_at).getTime() >=
      new Date(featureToggleSetting.updated_at).getTime(),
  );
}
