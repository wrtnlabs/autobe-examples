import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Administrator Registration and Authentication
  // Create a new administrator account to gain privileges for system configuration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const adminData = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Validate admin account structure - business logic only
  TestValidator.equals("admin username matches", admin.username, adminUsername);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Create System Setting
  // Use authenticated admin session to create a new configuration parameter
  const valueTypes = ["string", "int", "double", "boolean", "json"] as const;
  const categories = [
    "content",
    "moderation",
    "performance",
    "features",
  ] as const;

  const settingKey = `max_post_length_${RandomGenerator.alphaNumeric(6)}`;
  const settingValue = "5000";
  const settingDescription =
    "Maximum allowed length for post content in characters";
  const settingValueType = RandomGenerator.pick(valueTypes);
  const settingCategory = RandomGenerator.pick(categories);
  const settingIsPublic = typia.random<boolean>();

  const settingData = {
    key: settingKey,
    value: settingValue,
    description: settingDescription,
    value_type: settingValueType,
    category: settingCategory,
    is_public: settingIsPublic,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: settingData,
    });
  typia.assert(createdSetting);

  // Step 3: Validation
  // Verify the created setting contains all expected properties - business logic only
  TestValidator.equals("setting key matches", createdSetting.key, settingKey);
  TestValidator.equals(
    "setting value matches",
    createdSetting.value,
    settingValue,
  );
  TestValidator.equals(
    "setting description matches",
    createdSetting.description,
    settingDescription,
  );
  TestValidator.equals(
    "setting value_type matches",
    createdSetting.value_type,
    settingValueType,
  );
  TestValidator.equals(
    "setting category matches",
    createdSetting.category,
    settingCategory,
  );
  TestValidator.equals(
    "setting is_public matches",
    createdSetting.is_public,
    settingIsPublic,
  );
}
