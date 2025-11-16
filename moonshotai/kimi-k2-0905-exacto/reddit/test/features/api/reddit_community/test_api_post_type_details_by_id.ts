import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test retrieval of complete post type configuration details.
 *
 * Validates that users can access comprehensive information about specific post
 * types including name, description, content capabilities, media requirements,
 * and creation metadata. Important for understanding available post formats and
 * community setup decisions.
 */
export async function test_api_post_type_details_by_id(
  connection: api.IConnection,
) {
  // Generate a random UUID for testing post type retrieval
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  // Call the API to retrieve post type details
  const postType: IRedditCommunityPostType =
    await api.functional.redditCommunity.postTypes.at(connection, {
      postTypeId: postTypeId,
    });

  // Validate the response structure and all required fields
  typia.assert(postType);

  // Verify all core properties are present and correctly typed
  TestValidator.predicate(
    "post type has valid UUID ID",
    typeof postType.id === "string" && postType.id.length === 36,
  );
  TestValidator.predicate(
    "post type has non-empty name",
    typeof postType.name === "string" && postType.name.length > 0,
  );
  TestValidator.predicate(
    "post type has non-empty description",
    typeof postType.description === "string" && postType.description.length > 0,
  );
  TestValidator.predicate(
    "allows_text_content is boolean",
    typeof postType.allows_text_content === "boolean",
  );
  TestValidator.predicate(
    "allows_links is boolean",
    typeof postType.allows_links === "boolean",
  );
  TestValidator.predicate(
    "requires_media is boolean",
    typeof postType.requires_media === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof postType.created_at === "string" &&
      postType.created_at.includes("T"),
  );

  // Test with multiple randomly generated post type IDs to ensure consistency
  const testIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const testId of testIds) {
    const testPostType = await api.functional.redditCommunity.postTypes.at(
      connection,
      {
        postTypeId: testId,
      },
    );

    typia.assert(testPostType);
    TestValidator.equals(
      "post type ID matches request",
      testPostType.id,
      testId,
    );
  }
}
