import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_multiple_tags_and_logic(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for search operations
  const searchConnection: api.IConnection = { host: connection.host };
  // Generate multiple tag IDs for testing AND logic
  const tagId1 = typia.random<string & typia.tags.Format<"uuid">>();
  const tagId2 = typia.random<string & typia.tags.Format<"uuid">>();
  const tagId3 = typia.random<string & typia.tags.Format<"uuid">>();
  // Test 1: Search with single tag ID
  const singleTagResult = await api.functional.discussionBoard.articles.search(
    searchConnection,
    {
      body: {
        tagIds: [tagId1],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(singleTagResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    singleTagResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    singleTagResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    singleTagResult.pagination.records >= 0,
  );
  // Test 2: Search with multiple tag IDs (AND logic)
  const multipleTagResult =
    await api.functional.discussionBoard.articles.search(searchConnection, {
      body: {
        tagIds: [tagId1, tagId2],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(multipleTagResult);
  // Validate pagination for multiple tags search
  TestValidator.equals(
    "pagination current page",
    multipleTagResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    multipleTagResult.pagination.limit > 0,
  );
  // Test 3: Search with three tag IDs
  const threeTagResult = await api.functional.discussionBoard.articles.search(
    searchConnection,
    {
      body: {
        tagIds: [tagId1, tagId2, tagId3],
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(threeTagResult);
  // Validate limit parameter is applied correctly
  TestValidator.equals(
    "limit parameter applied",
    threeTagResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    threeTagResult.pagination.pages >= 0,
  );
  // Test 4: Search with empty tagIds array (should return all articles)
  const emptyTagResult = await api.functional.discussionBoard.articles.search(
    searchConnection,
    {
      body: {
        tagIds: [],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyTagResult);
  // Validate empty tagIds returns valid response
  TestValidator.predicate(
    "empty tagIds returns valid pagination",
    emptyTagResult.pagination.records >= 0,
  );
  // Test 5: Verify article summary structure in results
  if (singleTagResult.data.length > 0) {
    const firstArticle = singleTagResult.data[0];
    typia.assert(firstArticle);
    // Validate article has meaningful content
    TestValidator.predicate(
      "article title is non-empty",
      firstArticle.title.length > 0,
    );
    TestValidator.predicate(
      "section name exists",
      firstArticle.section.name.length > 0,
    );
    TestValidator.predicate(
      "author display name exists",
      firstArticle.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "comments count is non-negative",
      firstArticle.comments_count >= 0,
    );
  }
  // Test 6: Verify different tag combinations return different result counts
  const resultWithOneTag = await api.functional.discussionBoard.articles.search(
    searchConnection,
    {
      body: {
        tagIds: [tagId1],
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(resultWithOneTag);
  const resultWithTwoTags =
    await api.functional.discussionBoard.articles.search(searchConnection, {
      body: {
        tagIds: [tagId1, tagId2],
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(resultWithTwoTags);
  // AND logic should result in equal or fewer articles than single tag search
  TestValidator.predicate(
    "AND logic returns subset or equal results",
    resultWithTwoTags.pagination.records <= resultWithOneTag.pagination.records,
  );
}
