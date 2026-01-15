import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to perform search with proper authorization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Prepare search request with keyword and pagination parameters
  // Using a common keyword that is likely to exist in the system for real testing
  const searchKeyword = "article";
  const searchRequest: IDiscussionBoardArticle.IRequest = {
    q: searchKeyword,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;
  // Step 3: Execute search operation and validate results
  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: searchRequest,
    });
  typia.assert(searchResult);
  // Step 4: Validate search results
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "total results count is non-negative",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be at least 0",
    () => searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "results count matches pagination records",
    () => searchResult.data.length === searchResult.pagination.records,
  );
  // Verify that all returned articles contain the search keyword in title or content
  for (const article of searchResult.data) {
    TestValidator.predicate(
      "article contains search keyword in title or content",
      () => {
        const titleLower = article.title.toLowerCase();
        const contentLower = article.content.toLowerCase();
        return (
          titleLower.includes(searchKeyword) ||
          contentLower.includes(searchKeyword)
        );
      },
    );
  }
  // Verify that only published articles are returned (status must be 'published')
  for (const article of searchResult.data) {
    TestValidator.equals(
      "article status is published",
      article.status,
      "published",
    );
  }
  // Verify that search results have proper structure and types
  for (const article of searchResult.data) {
    TestValidator.equals("article has id", typeof article.id, "string");
    TestValidator.equals("article has title", typeof article.title, "string");
    TestValidator.equals(
      "article has content",
      typeof article.content,
      "string",
    );
    TestValidator.equals("article has status", typeof article.status, "string");
    TestValidator.equals(
      "article has created_at",
      typeof article.created_at,
      "string",
    );
    TestValidator.equals(
      "article has updated_at",
      typeof article.updated_at,
      "string",
    );
    TestValidator.equals("article has author", typeof article.author, "object");
    TestValidator.equals(
      "article has comments_count",
      typeof article.comments_count,
      "number",
    );
    TestValidator.equals(
      "article has likes_count",
      typeof article.likes_count,
      "number",
    );
    TestValidator.equals(
      "article has views_count",
      typeof article.views_count,
      "number",
    );
    TestValidator.equals(
      "article has thumbnail_url",
      typeof article.thumbnail_url,
      "string",
    );
    TestValidator.equals(
      "article has is_pinned",
      typeof article.is_pinned,
      "boolean",
    );
  }
}
