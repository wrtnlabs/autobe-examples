import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_search_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account via join authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Create an article to have searchable data
  // Note: In a real scenario, we would need a valid section ID.
  // For this test, we'll use a random UUID assuming it exists or the system handles creation.
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Execute article search with minimal filters - empty request body
  const searchResult = await api.functional.discussionBoard.user.articles.index(
    userConnection,
    {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  // Based on IPageIDiscussionBoardArticle.ISummary structure:
  // { pagination: IPageIDiscussionBoardSection.IPagination, data: IDiscussionBoardArticle.ISummary[] }
  // And IPageIDiscussionBoardSection.IPagination has: { pagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination, data: IDiscussionBoardSection.IPagination[] }
  // This is complex nesting, but we should validate basic pagination properties exist
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  // Since pagination structure is deeply nested, we'll validate at the deepest accessible level
  const deepestPagination =
    searchResult.pagination.pagination.pagination.pagination;
  TestValidator.predicate(
    "has valid current page",
    deepestPagination.current >= 0,
  );
  TestValidator.predicate("has valid limit", deepestPagination.limit >= 0);
  TestValidator.predicate(
    "has valid total records",
    deepestPagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid total pages",
    deepestPagination.pages >= 0,
  );
  // 5. Verify created article appears in search results
  const foundArticle = searchResult.data.find((item) => item.id === article.id);
  TestValidator.predicate(
    "created article should be in search results",
    foundArticle !== undefined,
  );
  if (foundArticle) {
    // Validate essential fields in article summary
    TestValidator.equals(
      "article title matches",
      foundArticle.title,
      article.title,
    );
    TestValidator.equals(
      "article author matches",
      foundArticle.author.id,
      article.author.id,
    );
    TestValidator.predicate(
      "article has status",
      typeof foundArticle.status === "string" && foundArticle.status.length > 0,
    );
    TestValidator.predicate(
      "article has section",
      foundArticle.section !== undefined,
    );
    TestValidator.predicate(
      "article has creation timestamp",
      typeof foundArticle.created_at === "string" &&
        foundArticle.created_at.length > 0,
    );
  }
}
