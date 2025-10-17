import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test the creation of system settings that define content validation limits.
 *
 * This test validates that administrators can create system settings to
 * configure platform-wide content constraints such as maximum post length,
 * comment length, and image file sizes. These settings provide flexible runtime
 * configuration without requiring code deployments, allowing the platform to
 * adjust resource limits and user-facing constraints dynamically.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a new administrator
 * 2. Create max_post_length setting with integer value type
 * 3. Create max_comment_length setting with integer value type
 * 4. Create max_image_file_size setting with double value type
 * 5. Validate each setting is created with correct properties and metadata
 */
export async function test_api_system_setting_creation_content_limits(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create max_post_length setting
  const maxPostLengthSetting = {
    key: "max_post_length",
    value: "50000",
    description: "Maximum number of characters allowed in a post",
    value_type: "int",
    category: "content",
    is_public: true,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdPostLengthSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: maxPostLengthSetting,
    });
  typia.assert(createdPostLengthSetting);

  // Validate max_post_length setting
  TestValidator.equals(
    "post length key",
    createdPostLengthSetting.key,
    "max_post_length",
  );
  TestValidator.equals(
    "post length value",
    createdPostLengthSetting.value,
    "50000",
  );
  TestValidator.equals(
    "post length value_type",
    createdPostLengthSetting.value_type,
    "int",
  );
  TestValidator.equals(
    "post length category",
    createdPostLengthSetting.category,
    "content",
  );
  TestValidator.equals(
    "post length is_public",
    createdPostLengthSetting.is_public,
    true,
  );

  // Step 3: Create max_comment_length setting
  const maxCommentLengthSetting = {
    key: "max_comment_length",
    value: "10000",
    description: "Maximum number of characters allowed in a comment",
    value_type: "int",
    category: "content",
    is_public: true,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdCommentLengthSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: maxCommentLengthSetting,
    });
  typia.assert(createdCommentLengthSetting);

  // Validate max_comment_length setting
  TestValidator.equals(
    "comment length key",
    createdCommentLengthSetting.key,
    "max_comment_length",
  );
  TestValidator.equals(
    "comment length value",
    createdCommentLengthSetting.value,
    "10000",
  );
  TestValidator.equals(
    "comment length value_type",
    createdCommentLengthSetting.value_type,
    "int",
  );
  TestValidator.equals(
    "comment length category",
    createdCommentLengthSetting.category,
    "content",
  );
  TestValidator.equals(
    "comment length is_public",
    createdCommentLengthSetting.is_public,
    true,
  );

  // Step 4: Create max_image_file_size setting
  const maxImageFileSizeSetting = {
    key: "max_image_file_size",
    value: "5242880",
    description: "Maximum image file size in bytes (5MB)",
    value_type: "double",
    category: "content",
    is_public: true,
  } satisfies IRedditLikeSystemSetting.ICreate;

  const createdImageFileSizeSetting: IRedditLikeSystemSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: maxImageFileSizeSetting,
    });
  typia.assert(createdImageFileSizeSetting);

  // Validate max_image_file_size setting
  TestValidator.equals(
    "image file size key",
    createdImageFileSizeSetting.key,
    "max_image_file_size",
  );
  TestValidator.equals(
    "image file size value",
    createdImageFileSizeSetting.value,
    "5242880",
  );
  TestValidator.equals(
    "image file size value_type",
    createdImageFileSizeSetting.value_type,
    "double",
  );
  TestValidator.equals(
    "image file size category",
    createdImageFileSizeSetting.category,
    "content",
  );
  TestValidator.equals(
    "image file size is_public",
    createdImageFileSizeSetting.is_public,
    true,
  );
}
