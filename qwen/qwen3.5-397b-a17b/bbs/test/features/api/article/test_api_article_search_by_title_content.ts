import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_search_by_title_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create multiple articles with distinct titles and content
  const uniqueSearchTerm = "UniqueSearchTerm" + RandomGenerator.alphabets(5);
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: `${uniqueSearchTerm} First Article Title`,
          content: `This content contains ${uniqueSearchTerm} for testing search functionality.`,
        },
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: `${uniqueSearchTerm} Second Article Title`,
          content: `Another article with ${uniqueSearchTerm} in the content for search testing.`,
        },
      },
    );
  typia.assert(article2);
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Completely Different Article",
          content:
            "This article has no matching search terms and should not appear in results.",
        },
      },
    );
  typia.assert(article3);
  // 3. Perform search with query matching article1 and article2
  const searchResults =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          search: uniqueSearchTerm,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults);
  // 4. Validate search results contain matching articles
  TestValidator.predicate(
    "search returns results",
    () => searchResults.data.length >= 2,
  );
  TestValidator.predicate("article1 found in results", () =>
    searchResults.data.some((article) => article.id === article1.id),
  );
  TestValidator.predicate("article2 found in results", () =>
    searchResults.data.some((article) => article.id === article2.id),
  );
  TestValidator.predicate(
    "article3 not in results",
    () => !searchResults.data.some((article) => article.id === article3.id),
  );
  // 5. Validate each result has required fields
  for (const article of searchResults.data) {
    TestValidator.predicate("article has id", () => article.id !== undefined);
    TestValidator.predicate(
      "article has title",
      () => article.title !== undefined,
    );
    TestValidator.predicate(
      "article has author",
      () => article.author !== undefined,
    );
    TestValidator.predicate(
      "author has display_name",
      () => article.author.display_name !== undefined,
    );
    TestValidator.predicate("article has tags array", () =>
      Array.isArray(article.tags),
    );
    TestValidator.predicate(
      "article has comments_count",
      () => typeof article.comments_count === "number",
    );
    TestValidator.predicate(
      "article has created_at",
      () => article.created_at !== undefined,
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    () => searchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => searchResults.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => searchResults.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => searchResults.pagination.pages >= 1,
  );
  TestValidator.equals(
    "records matches data length",
    searchResults.pagination.records,
    searchResults.data.length,
  );
  // 7. Test case-insensitive search
  const lowerCaseSearch =
    await api.functional.discussionBoard.member.articles.search(
      memberConnection,
      {
        body: {
          search: uniqueSearchTerm.toLowerCase(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(lowerCaseSearch);
  TestValidator.predicate(
    "case-insensitive search returns same results",
    () => lowerCaseSearch.data.length >= 2,
  );
}
