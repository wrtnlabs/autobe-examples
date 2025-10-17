import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that administrators can retrieve system settings with different value
 * types and verify proper type indicator handling.
 *
 * This test validates the system's ability to manage heterogeneous
 * configuration parameters with appropriate type metadata. System settings
 * store configuration values as strings with a value_type field that indicates
 * the proper deserialization type.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to access system configuration management
 * 2. Create system settings with different value_type configurations (string, int,
 *    double, boolean, json)
 * 3. Retrieve each created system setting by ID
 * 4. Validate that value_type field correctly indicates the type for each setting
 * 5. Verify all setting properties are correctly returned
 */
export async function test_api_system_setting_retrieval_configuration_types(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create system settings with different value types
  const stringSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "max_post_title_length",
        value: "300",
        description: "Maximum character length for post titles",
        value_type: "string",
        category: "content",
        is_public: true,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(stringSetting);

  const intSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "rate_limit_posts_per_hour",
        value: "10",
        description: "Maximum number of posts a user can create per hour",
        value_type: "int",
        category: "moderation",
        is_public: false,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(intSetting);

  const doubleSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "karma_multiplier",
        value: "1.5",
        description: "Multiplier for karma calculation",
        value_type: "double",
        category: "performance",
        is_public: false,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(doubleSetting);

  const booleanSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "enable_downvotes",
        value: "true",
        description: "Whether downvoting is enabled platform-wide",
        value_type: "boolean",
        category: "features",
        is_public: true,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(booleanSetting);

  const jsonSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "allowed_file_types",
        value: JSON.stringify({ images: ["jpg", "png"], videos: ["mp4"] }),
        description: "Configuration object for allowed upload file types",
        value_type: "json",
        category: "content",
        is_public: true,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(jsonSetting);

  // 3. Retrieve each setting and validate value_type
  const retrievedStringSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: stringSetting.id,
    });
  typia.assert(retrievedStringSetting);
  TestValidator.equals(
    "string setting value_type",
    retrievedStringSetting.value_type,
    "string",
  );
  TestValidator.equals(
    "string setting key matches",
    retrievedStringSetting.key,
    "max_post_title_length",
  );
  TestValidator.equals(
    "string setting value matches",
    retrievedStringSetting.value,
    "300",
  );

  const retrievedIntSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: intSetting.id,
    });
  typia.assert(retrievedIntSetting);
  TestValidator.equals(
    "int setting value_type",
    retrievedIntSetting.value_type,
    "int",
  );
  TestValidator.equals(
    "int setting key matches",
    retrievedIntSetting.key,
    "rate_limit_posts_per_hour",
  );
  TestValidator.equals(
    "int setting value matches",
    retrievedIntSetting.value,
    "10",
  );

  const retrievedDoubleSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: doubleSetting.id,
    });
  typia.assert(retrievedDoubleSetting);
  TestValidator.equals(
    "double setting value_type",
    retrievedDoubleSetting.value_type,
    "double",
  );
  TestValidator.equals(
    "double setting key matches",
    retrievedDoubleSetting.key,
    "karma_multiplier",
  );
  TestValidator.equals(
    "double setting value matches",
    retrievedDoubleSetting.value,
    "1.5",
  );

  const retrievedBooleanSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: booleanSetting.id,
    });
  typia.assert(retrievedBooleanSetting);
  TestValidator.equals(
    "boolean setting value_type",
    retrievedBooleanSetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "boolean setting key matches",
    retrievedBooleanSetting.key,
    "enable_downvotes",
  );
  TestValidator.equals(
    "boolean setting value matches",
    retrievedBooleanSetting.value,
    "true",
  );

  const retrievedJsonSetting =
    await api.functional.redditLike.admin.system.settings.at(connection, {
      id: jsonSetting.id,
    });
  typia.assert(retrievedJsonSetting);
  TestValidator.equals(
    "json setting value_type",
    retrievedJsonSetting.value_type,
    "json",
  );
  TestValidator.equals(
    "json setting key matches",
    retrievedJsonSetting.key,
    "allowed_file_types",
  );
  TestValidator.equals(
    "json setting value matches",
    retrievedJsonSetting.value,
    JSON.stringify({ images: ["jpg", "png"], videos: ["mp4"] }),
  );

  // 4. Verify all settings have proper structure with required fields
  TestValidator.predicate("string setting has ID", stringSetting.id.length > 0);
  TestValidator.predicate(
    "string setting has timestamps",
    !!stringSetting.created_at && !!stringSetting.updated_at,
  );
  TestValidator.predicate(
    "int setting has category",
    intSetting.category === "moderation",
  );
  TestValidator.predicate(
    "boolean setting is public",
    booleanSetting.is_public === true,
  );
  TestValidator.predicate(
    "json setting has description",
    !!jsonSetting.description,
  );
}
