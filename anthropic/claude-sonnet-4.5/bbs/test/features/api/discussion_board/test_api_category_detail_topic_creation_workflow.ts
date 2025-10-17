import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test category detail retrieval workflow during topic creation.
 *
 * This test validates that users can retrieve comprehensive category details to
 * make informed decisions when selecting a category for their discussion topic.
 * The test ensures the API returns complete category information including
 * description for scope guidance and topic_count for activity indication.
 *
 * Workflow:
 *
 * 1. Generate a category ID to simulate user selecting a category to view details
 * 2. Retrieve category details via GET /discussionBoard/categories/{categoryId}
 * 3. Validate the complete response structure and all fields are properly
 *    populated
 * 4. Verify response provides sufficient information for informed category
 *    selection
 */
export async function test_api_category_detail_topic_creation_workflow(
  connection: api.IConnection,
) {
  // Generate a random category ID to simulate selecting a category
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the category details
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: categoryId,
    });

  // Validate the complete response structure - this validates ALL types perfectly
  typia.assert(category);

  // Verify the category ID matches the requested ID
  TestValidator.equals(
    "category ID matches requested ID",
    category.id,
    categoryId,
  );

  // Business logic validation: verify response supports informed category selection
  // The description and topic_count are key fields that help users make decisions
  TestValidator.predicate(
    "response contains category information for user decision-making",
    category.name !== null && category.slug !== null,
  );
}
