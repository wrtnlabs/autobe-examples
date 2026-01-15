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
export async function test_api_article_search_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  // Step 2: Search for articles with a query that will match existing content
  // Use a general term that might match published articles in the system
  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(citizenConnection, {
      body: {
        q: "project",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult);
  // Step 3: Validate the expected search results structure
  // According to the scenario, we should be displaying only published articles
  TestValidator.equals(
    "total articles count should be finite",
    searchResult.pagination.records,
    searchResult.data.length,
  );
  TestValidator.equals(
    "page limit matches request",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  // Validate that all returned articles are published status
  // This is based on the business requirement that citizens can only see published articles
  const allPublished = searchResult.data.every(
    (article) => article.status === "published",
  );
  TestValidator.predicate(
    "all returned articles have published status",
    allPublished,
  );
  // Validate that returned articles have consistent content structure
  // Each article should have title and content
  const allHaveTitle = searchResult.data.every(
    (article) => article.title && article.title.length > 0,
  );
  TestValidator.predicate(
    "all returned articles have non-empty titles",
    allHaveTitle,
  );
  const allHaveContent = searchResult.data.every(
    (article) => article.content && article.content.length > 0,
  );
  TestValidator.predicate(
    "all returned articles have non-empty content",
    allHaveContent,
  );
  // Validate that search query 'project' is found in at least one result
  // This verifies the search functionality actually works with the provided query
  const hasMatchingContent = searchResult.data.some(
    (article) =>
      article.title.toLowerCase().includes("project") ||
      article.content.toLowerCase().includes("project"),
  );
  TestValidator.predicate(
    "search query 'project' matches at least one article",
    hasMatchingContent,
  );
}
