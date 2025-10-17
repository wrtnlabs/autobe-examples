import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test the creation of system settings that act as feature toggles enabling or
 * disabling specific platform capabilities.
 *
 * This test validates that administrators can create boolean-valued
 * configuration settings that control feature availability dynamically without
 * requiring code deployments.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as administrator
 * 2. Create 'image_posts_enabled' feature toggle setting
 * 3. Create 'comment_editing_enabled' feature toggle setting
 * 4. Create 'karma_display_enabled' feature toggle setting
 * 5. Validate each setting's structure and properties
 */
export async function test_api_system_setting_creation_feature_toggles(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create 'image_posts_enabled' feature toggle setting
  const imagePostsSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "image_posts_enabled",
        value: "true",
        description:
          "Controls whether users can create posts with image attachments",
        value_type: "boolean",
        category: "features",
        is_public: true,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(imagePostsSetting);
  TestValidator.equals(
    "image posts setting key",
    imagePostsSetting.key,
    "image_posts_enabled",
  );
  TestValidator.equals(
    "image posts setting value",
    imagePostsSetting.value,
    "true",
  );
  TestValidator.equals(
    "image posts setting value_type",
    imagePostsSetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "image posts setting category",
    imagePostsSetting.category,
    "features",
  );
  TestValidator.equals(
    "image posts setting is_public",
    imagePostsSetting.is_public,
    true,
  );

  // Step 3: Create 'comment_editing_enabled' feature toggle setting
  const commentEditingSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "comment_editing_enabled",
        value: "false",
        description: "Allows users to edit their comments after posting",
        value_type: "boolean",
        category: "features",
        is_public: true,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(commentEditingSetting);
  TestValidator.equals(
    "comment editing setting key",
    commentEditingSetting.key,
    "comment_editing_enabled",
  );
  TestValidator.equals(
    "comment editing setting value",
    commentEditingSetting.value,
    "false",
  );
  TestValidator.equals(
    "comment editing setting value_type",
    commentEditingSetting.value_type,
    "boolean",
  );

  // Step 4: Create 'karma_display_enabled' feature toggle setting
  const karmaDisplaySetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "karma_display_enabled",
        value: "true",
        description:
          "Controls visibility of user karma scores on profiles and posts",
        value_type: "boolean",
        category: "features",
        is_public: false,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(karmaDisplaySetting);
  TestValidator.equals(
    "karma display setting key",
    karmaDisplaySetting.key,
    "karma_display_enabled",
  );
  TestValidator.equals(
    "karma display setting value",
    karmaDisplaySetting.value,
    "true",
  );
  TestValidator.equals(
    "karma display setting value_type",
    karmaDisplaySetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "karma display setting is_public",
    karmaDisplaySetting.is_public,
    false,
  );
}
