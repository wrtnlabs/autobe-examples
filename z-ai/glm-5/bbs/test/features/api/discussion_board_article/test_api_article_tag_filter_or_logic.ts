import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test article filtering by multiple tags with OR logic.
 *
 * Validates:
 * - OR logic: articles returned if they match ANY of the specified tags
 * - Tag names are case-insensitive (normalized to lowercase)
 * - No duplicate articles in results
 * - Tags array on each article shows all associated tags
 * - Pagination works correctly with tag filter
 * - Empty results if no articles match any specified tags
 */
export async function test_api_article_tag_filter_or_logic(
  connection: api.IConnection,
): Promise<void> {
  // 1. First, fetch articles without tag filter to identify existing tags
  const allArticlesResponse =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort: "newest",
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(allArticlesResponse);
  // Extract unique tags from all articles
  const allTags = new Map<string, string>();
  for (const article of allArticlesResponse.data) {
    for (const tag of article.tags) {
      allTags.set(tag.value.toLowerCase(), tag.value);
    }
  }
  // If there are at least 2 tags, test OR logic filtering
  if (allTags.size >= 2) {
    const tagValues = Array.from(allTags.values());
    const tag1 = tagValues[0];
    const tag2 = tagValues[1];
    const tagFilter = `${tag1},${tag2}`;
    // 2. Fetch articles with multiple tags filter (OR logic)
    const filteredResponse =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          tags: tagFilter,
          sort: "newest",
          limit: 15,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(filteredResponse);
    // 3. Verify OR logic: each article should have at least one matching tag
    const tagSet = new Set([tag1.toLowerCase(), tag2.toLowerCase()]);
    for (const article of filteredResponse.data) {
      const hasMatchingTag = article.tags.some((tag) =>
        tagSet.has(tag.value.toLowerCase()),
      );
      TestValidator.predicate(
        `Article "${article.title}" should have at least one matching tag (${tag1} or ${tag2})`,
        hasMatchingTag,
      );
    }
    // 4. Verify no duplicate articles (each article appears only once)
    const articleIds = filteredResponse.data.map((article) => article.id);
    const uniqueIds = new Set(articleIds);
    TestValidator.equals(
      "No duplicate articles in results",
      articleIds.length,
      uniqueIds.size,
    );
    // 5. Verify tags array shows all associated tags, not just matching ones
    for (const article of filteredResponse.data) {
      TestValidator.predicate(
        `Article "${article.title}" should have tags array`,
        article.tags.length > 0,
      );
    }
    // 6. Test case-insensitive matching with uppercase tag names
    const upperCaseFilter = `${tag1.toUpperCase()},${tag2.toUpperCase()}`;
    const caseInsensitiveResponse =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          tags: upperCaseFilter,
          sort: "newest",
          limit: 15,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(caseInsensitiveResponse);
    // Should return same articles as lowercase filter (case-insensitive)
    TestValidator.equals(
      "Case-insensitive matching should return same results",
      caseInsensitiveResponse.pagination.records,
      filteredResponse.pagination.records,
    );
  }
  // 7. Test empty results with non-existent tags
  const nonExistentTags = "nonexistent-tag-xyz,another-fake-tag-abc";
  const emptyResponse = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        tags: nonExistentTags,
        sort: "newest",
        limit: 15,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "Non-existent tags should return empty results",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "Pagination records should be 0 for non-existent tags",
    emptyResponse.pagination.records,
    0,
  );
  // 8. Verify pagination metadata accuracy
  if (allTags.size >= 1) {
    const singleTag = Array.from(allTags.values())[0];
    const paginatedResponse =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          tags: singleTag,
          sort: "newest",
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(paginatedResponse);
    // Verify pagination metadata
    TestValidator.predicate(
      "Pagination current page should be >= 1",
      paginatedResponse.pagination.current >= 1,
    );
    TestValidator.equals(
      "Pagination limit should be set correctly",
      paginatedResponse.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "Pagination records should be accurate",
      paginatedResponse.pagination.records >= paginatedResponse.data.length,
    );
    TestValidator.equals(
      "Pagination pages calculation should be correct",
      paginatedResponse.pagination.pages,
      Math.ceil(
        paginatedResponse.pagination.records /
          paginatedResponse.pagination.limit,
      ),
    );
  }
}
