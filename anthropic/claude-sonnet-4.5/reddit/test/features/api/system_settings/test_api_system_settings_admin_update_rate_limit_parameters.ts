import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that administrators can update rate limiting configuration parameters.
 *
 * This test validates the complete workflow for updating integer-type system
 * settings that control platform security and anti-spam measures. The test
 * creates an admin account, creates a rate limit setting with an initial
 * threshold value, then updates the setting to a different threshold to
 * validate the modification mechanism.
 *
 * Steps:
 *
 * 1. Create administrator account with authentication
 * 2. Create initial rate limit setting with baseline threshold
 * 3. Update the setting to new threshold value
 * 4. Verify updated configuration is reflected correctly
 */
export async function test_api_system_settings_admin_update_rate_limit_parameters(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Verify admin authentication token is set
  TestValidator.predicate(
    "admin has access token",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin is authenticated",
    connection.headers?.Authorization === admin.token.access,
  );

  // Step 2: Create initial rate limit setting
  const initialThreshold = "10";
  const settingKey = `rate_limit_posts_per_hour_${RandomGenerator.alphaNumeric(6)}`;

  const createData = {
    key: settingKey,
    value: initialThreshold,
    description: "Maximum number of posts a user can create per hour",
    value_type: "int",
    category: "rate_limiting",
    is_public: false,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: createData,
    });
  typia.assert(createdSetting);

  // Validate created setting
  TestValidator.equals("setting key matches", createdSetting.key, settingKey);
  TestValidator.equals(
    "initial value is set",
    createdSetting.value,
    initialThreshold,
  );
  TestValidator.equals("value type is int", createdSetting.value_type, "int");
  TestValidator.equals(
    "category is rate_limiting",
    createdSetting.category,
    "rate_limiting",
  );
  TestValidator.predicate("setting has ID", createdSetting.id.length > 0);

  // Step 3: Update the rate limit setting to new threshold
  const newThreshold = "25";
  const updateData = {
    value: newThreshold,
    description:
      "Updated maximum number of posts per hour - increased threshold",
  } satisfies IRedditLikeSystemSetting.IUpdate;

  const updatedSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.update(connection, {
      id: createdSetting.id,
      body: updateData,
    });
  typia.assert(updatedSetting);

  // Step 4: Verify the update was successful
  TestValidator.equals(
    "setting ID unchanged",
    updatedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals("setting key unchanged", updatedSetting.key, settingKey);
  TestValidator.equals(
    "value updated to new threshold",
    updatedSetting.value,
    newThreshold,
  );
  TestValidator.equals(
    "value type remains int",
    updatedSetting.value_type,
    "int",
  );
  TestValidator.equals(
    "description updated",
    updatedSetting.description,
    "Updated maximum number of posts per hour - increased threshold",
  );
  TestValidator.equals(
    "category unchanged",
    updatedSetting.category,
    "rate_limiting",
  );
  TestValidator.equals("visibility unchanged", updatedSetting.is_public, false);

  // Verify timestamps
  TestValidator.predicate(
    "has created_at timestamp",
    updatedSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    updatedSetting.updated_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedSetting.updated_at) >= new Date(updatedSetting.created_at),
  );
}
