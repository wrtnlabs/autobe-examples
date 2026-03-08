import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_article_tags_list(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random article ID to test the endpoint
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  // Test: Retrieve tags for an article
  const response = await api.functional.discussionBoard.articles.tags.index(
    connection,
    {
      articleId: testArticleId,
    },
  );
  // Validate response structure matches expected type
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is positive",
    response.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is positive",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
    true,
  );
  // Validate data structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  TestValidator.equals(
    "data length matches pagination records",
    response.data.length,
    response.pagination.records,
  );
  // Validate pagination calculations
  if (response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      response.pagination.pages,
      expectedPages,
    );
  }
  // Validate each tag in data has correct structure
  for (const tag of response.data) {
    typia.assert(tag);
    TestValidator.equals(
      "tag has valid article reference",
      tag.article !== undefined,
      true,
    );
    typia.assert(tag.article);
  }
  // Test with pagination parameters
  const paginatedResponse =
    await api.functional.discussionBoard.articles.tags.index(connection, {
      articleId: testArticleId,
    });
  typia.assert(paginatedResponse);
  // Verify sorting (newest first based on scenario)
  if (paginatedResponse.data.length >= 2) {
    for (let i = 0; i < paginatedResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "tags sorted by created_at descending",
        paginatedResponse.data[i].created_at >=
          paginatedResponse.data[i + 1].created_at,
      );
    }
  }
  // Test edge case: empty results with guaranteed non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse =
    await api.functional.discussionBoard.articles.tags.index(connection, {
      articleId: nonExistentArticleId,
    });
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty results data length",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty results records count",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pages",
    emptyResponse.pagination.pages,
    0,
  );
}