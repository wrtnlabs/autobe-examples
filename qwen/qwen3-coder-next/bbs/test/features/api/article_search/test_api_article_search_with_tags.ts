import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_with_tags(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with single tag
  const singleTagResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 20,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        tags: ["typescript"],
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(singleTagResult);
  // Test 2: Search with multiple tags (AND logic)
  const multipleTagResult =
    await api.functional.discussionBoard.articles.search(connection, {
      body: {
        pagination: {
          limit: 20,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        tags: ["typescript", "nodejs"],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(multipleTagResult);
  // Test 3: Search with non-existent tag
  const noTagResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 20,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        tags: ["nonexistent"],
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(noTagResult);
  // Test 4: Search without tags (all articles)
  const allResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 20,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has correct structure",
    singleTagResult.pagination.current >= 0 &&
      singleTagResult.pagination.limit > 0 &&
      singleTagResult.pagination.pages >= 0 &&
      singleTagResult.pagination.records >= 0,
  );
  // Validate article summary structure
  if (singleTagResult.data.length > 0) {
    const article = singleTagResult.data[0];
    TestValidator.predicate(
      "article has valid id",
      /^[0-9a-f-]{36}$/i.test(article.id),
    );
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article has author",
      typeof article.author?.id === "string" && article.author.id.length > 0,
    );
    TestValidator.predicate(
      "article has section",
      typeof article.section?.id === "string" && article.section.id.length > 0,
    );
  }
}
