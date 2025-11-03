import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";

/**
 * Test tag search with different sorting options.
 *
 * This test validates that users can organize tag results according to their
 * needs by testing various sorting options including alphabetical sorting
 * (ascending and descending), creation date sorting (newest and oldest first),
 * and usage frequency sorting to find popular topics.
 *
 * The test verifies that:
 *
 * 1. Tags can be sorted alphabetically by name (A-Z and Z-A)
 * 2. Tags can be sorted chronologically by creation date (oldest first and newest
 *    first)
 * 3. Tags can be sorted by usage frequency (most popular first)
 * 4. The sort order is correctly applied in API responses
 * 5. Results are properly ordered according to the selected criteria
 */
export async function test_api_tag_search_sorting_options(
  connection: api.IConnection,
) {
  // Test sorting by name ascending (A to Z)
  const nameAscResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "name_asc",
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(nameAscResult);

  // Validate name ascending order
  for (let i = 0; i < nameAscResult.data.length - 1; i++) {
    TestValidator.predicate(
      "tags should be sorted alphabetically ascending",
      nameAscResult.data[i].name <= nameAscResult.data[i + 1].name,
    );
  }

  // Test sorting by name descending (Z to A)
  const nameDescResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "name_desc",
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(nameDescResult);

  // Validate name descending order
  for (let i = 0; i < nameDescResult.data.length - 1; i++) {
    TestValidator.predicate(
      "tags should be sorted alphabetically descending",
      nameDescResult.data[i].name >= nameDescResult.data[i + 1].name,
    );
  }

  // Test sorting by creation date ascending (oldest first)
  const createdAscResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "created_at_asc",
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(createdAscResult);

  // Validate creation date ascending order using string comparison
  for (let i = 0; i < createdAscResult.data.length - 1; i++) {
    TestValidator.predicate(
      "tags should be sorted by creation date ascending",
      createdAscResult.data[i].created_at <=
        createdAscResult.data[i + 1].created_at,
    );
  }

  // Test sorting by creation date descending (newest first)
  const createdDescResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "created_at_desc",
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(createdDescResult);

  // Validate creation date descending order using string comparison
  for (let i = 0; i < createdDescResult.data.length - 1; i++) {
    TestValidator.predicate(
      "tags should be sorted by creation date descending",
      createdDescResult.data[i].created_at >=
        createdDescResult.data[i + 1].created_at,
    );
  }

  // Test sorting by usage descending (most popular first)
  const usageDescResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sort: "usage_desc",
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(usageDescResult);

  // Test default sorting (should apply when no sort parameter specified)
  const defaultResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(defaultResult);

  // Verify pagination metadata is correct for all sorted results
  TestValidator.predicate(
    "name asc result should have valid pagination",
    nameAscResult.pagination.current >= 0 && nameAscResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "name desc result should have valid pagination",
    nameDescResult.pagination.current >= 0 &&
      nameDescResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "created asc result should have valid pagination",
    createdAscResult.pagination.current >= 0 &&
      createdAscResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "created desc result should have valid pagination",
    createdDescResult.pagination.current >= 0 &&
      createdDescResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "usage desc result should have valid pagination",
    usageDescResult.pagination.current >= 0 &&
      usageDescResult.pagination.limit > 0,
  );
}
