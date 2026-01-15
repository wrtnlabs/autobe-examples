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
export async function test_api_article_search_with_min_trust_score_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
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
  // Step 2: Perform article search with min_trust_score: 50, page: 3, limit: 50
  const searchCriteria: IDiscussionBoardArticle.IRequest = {
    min_trust_score: 50,
    page: 3,
    limit: 50,
  } satisfies IDiscussionBoardArticle.IRequest;
  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.posts.index(memberConnection, {
      body: searchCriteria,
    });
  typia.assert(searchResult);
  // Step 3: Validate response structure and pagination
  TestValidator.equals(
    "pagination page number",
    searchResult.pagination.current,
    3,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 50);
  TestValidator.predicate(
    "pagination records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    searchResult.pagination.pages >= 0,
  );
  // Step 4: Validate that all returned articles have trust score >= 50 (minimum trust score requirement)
  // Note: We cannot control original article data, so we verify filtering is applied correctly
  for (const article of searchResult.data) {
    TestValidator.predicate(
      "article author trust score >= 50",
      article.author.trust_score >= 50,
    );
  }
  // Step 5: Validate article summary structure
  for (const article of searchResult.data) {
    TestValidator.predicate("article has id", typeof article.id === "string");
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article has content",
      typeof article.content === "string",
    );
    TestValidator.equals(
      "article status is published",
      article.status,
      "published",
    );
    TestValidator.predicate("article has author", article.author !== null);
    TestValidator.predicate(
      "article has valid author id",
      typeof article.author.id === "string",
    );
    TestValidator.predicate(
      "article has valid author trust score",
      typeof article.author.trust_score === "number",
    );
    TestValidator.predicate(
      "article has valid trust score range",
      article.author.trust_score >= 0 && article.author.trust_score <= 100,
    );
    TestValidator.predicate(
      "article has category",
      article.category !== undefined,
    );
    TestValidator.predicate(
      "article has valid category id",
      article.category !== undefined && typeof article.category.id === "string",
    );
    TestValidator.predicate(
      "article has valid category name",
      article.category !== undefined &&
        typeof article.category.name === "string" &&
        article.category.name.length > 0,
    );
    TestValidator.predicate(
      "article has valid created_at",
      typeof article.created_at === "string",
    );
    TestValidator.predicate(
      "article has valid updated_at",
      typeof article.updated_at === "string",
    );
    TestValidator.predicate(
      "article has comments_count",
      typeof article.comments_count === "number" && article.comments_count >= 0,
    );
    TestValidator.predicate(
      "article has likes_count",
      typeof article.likes_count === "number" && article.likes_count >= 0,
    );
    TestValidator.predicate(
      "article has views_count",
      typeof article.views_count === "number" && article.views_count >= 0,
    );
    TestValidator.predicate(
      "article has thumbnail_url",
      typeof article.thumbnail_url === "string" &&
        article.thumbnail_url.length > 0,
    );
    TestValidator.predicate(
      "article has is_pinned",
      typeof article.is_pinned === "boolean",
    );
    TestValidator.predicate(
      "article has average_rating",
      typeof article.average_rating === "number" &&
        article.average_rating >= 0 &&
        article.average_rating <= 5,
    );
    TestValidator.predicate(
      "article has soundbite",
      typeof article.soundbite === "string" && article.soundbite.length <= 160,
    );
    TestValidator.predicate(
      "article has is_verified",
      typeof article.is_verified === "boolean",
    );
  }
}
