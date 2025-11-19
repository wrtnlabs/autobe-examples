import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_search_exceeds_max_length(
  connection: api.IConnection,
) {
  // Create a search query that definitively exceeds the maximum length constraint of 200 characters
  // Generate a base string and repeat it to guarantee exceeding the limit
  const baseString = "test search query content for validation purposes ";
  const oversizedSearchQuery = baseString.repeat(10); // This creates a string > 600 characters

  // Verify the query actually exceeds the limit
  TestValidator.predicate(
    "search query should exceed maximum length of 200 characters",
    oversizedSearchQuery.length > 200,
  );

  // Attempt to call the API with the oversized search query
  // This should return a validation error from the server
  await TestValidator.error(
    "API should reject search query exceeding 200 character maximum",
    async () => {
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          search: oversizedSearchQuery,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    },
  );
}
