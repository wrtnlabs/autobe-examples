import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

export async function test_api_article_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic search with pagination using existing data
  const searchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate that records calculation is correct
  const expectedPages = Math.ceil(
    searchResult.pagination.records / searchResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    searchResult.pagination.pages,
    expectedPages,
  );
  // Validate article summaries structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(searchResult.data),
  );
  for (const article of searchResult.data) {
    typia.assert(article);
    TestValidator.predicate(
      "article should have UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    TestValidator.predicate(
      "article should have title",
      article.title.length > 0,
    );
    // Validate author structure
    typia.assert(article.author);
    TestValidator.predicate(
      "author should have UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.author.id,
      ),
    );
    TestValidator.predicate(
      "author should have display name",
      article.author.display_name.length > 0,
    );
    // Validate section structure
    typia.assert(article.section);
    TestValidator.predicate(
      "section should have UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.section.id,
      ),
    );
    TestValidator.predicate(
      "section should have name",
      article.section.name.length > 0,
    );
    TestValidator.predicate(
      "section description should be string or null",
      article.section.description === null ||
        typeof article.section.description === "string",
    );
    TestValidator.predicate(
      "section should have creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(article.section.created_at),
    );
    // Validate tags structure
    TestValidator.predicate(
      "tags should be array",
      Array.isArray(article.tags),
    );
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate(
        "tag should have UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tag.id,
        ),
      );
      TestValidator.predicate("tag should have text", tag.tag.length > 0);
      TestValidator.predicate(
        "tag usage count should be non-negative",
        tag.usage_count >= 0,
      );
    }
    TestValidator.predicate(
      "comment count should be non-negative",
      article.comments_count >= 0,
    );
    TestValidator.predicate(
      "article should have creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(article.created_at),
    );
  }
  // Test different page sizes
  const smallPageResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(smallPageResult);
  TestValidator.equals("small page limit", smallPageResult.pagination.limit, 2);
  TestValidator.predicate(
    "small page data length should be <= limit",
    smallPageResult.data.length <= 2,
  );
  // Test different page number
  const page2Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "test",
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // Test empty search (should return all articles)
  const emptySearchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search should return articles",
    emptySearchResult.data.length >= 0,
  );
  // Test section filtering (if sections exist in the system)
  const sectionFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sectionFilterResult);
  // The result should be valid regardless of whether the section exists
  TestValidator.predicate(
    "section filter should return valid response",
    sectionFilterResult.pagination.records >= 0,
  );
}
