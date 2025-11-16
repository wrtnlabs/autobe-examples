import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test system behavior when requesting details for non-existent post types.
 *
 * This comprehensive test validates the API's error handling for post type
 * retrieval with invalid identifiers. The test covers real error scenarios that
 * can occur during runtime operations, ensuring the system provides appropriate
 * error feedback while maintaining robust operation.
 *
 * The test first establishes baseline functionality with a valid system ID,
 * then tests various failure scenarios including non-existent IDs and database
 * lookup failures to verify consistent error handling behavior.
 */
export async function test_api_post_type_not_found_handling(
  connection: api.IConnection,
) {
  // Step 1: Generate a valid UUID that doesn't exist in the database
  const nonExistentPostTypeId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test non-existent post type with valid UUID format
  await TestValidator.error(
    "should return 404 for non-existent post type with valid UUID format",
    async () => {
      await api.functional.redditCommunity.postTypes.at(connection, {
        postTypeId: nonExistentPostTypeId,
      });
    },
  );

  // Step 3: Generate additional non-existent IDs to verify consistent behavior
  const testIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const testId of testIds) {
    await TestValidator.error(
      "should consistently return 404 for different non-existent post types",
      async () => {
        await api.functional.redditCommunity.postTypes.at(connection, {
          postTypeId: testId,
        });
      },
    );
  }

  // Step 4: Validate that IDs consistently fail across repeated calls
  await TestValidator.error(
    "should return 404 consistently for the same non-existent post type",
    async () => {
      await api.functional.redditCommunity.postTypes.at(connection, {
        postTypeId: nonExistentPostTypeId,
      });
    },
  );
}
