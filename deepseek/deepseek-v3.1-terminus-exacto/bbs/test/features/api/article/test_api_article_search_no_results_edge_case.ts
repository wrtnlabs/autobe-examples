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

export async function test_api_article_search_no_results_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user (search endpoint requires authentication)
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: We cannot create articles since no article creation API is provided
  // We'll search for genuinely non-existent criteria that should return empty results
  // 2. Test searches that should return zero results
  // Search for article with non-existent UUID
  const emptyResults1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.user.articles.index(userConnection, {
      body: {
        id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyResults1);
  // Correct pagination access - 4 levels deep
  const pagination1 = emptyResults1.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination records should be 0",
    pagination1.records,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResults1.data.length,
    0,
  );
  // Search for article with non-existent author
  const emptyResults2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.user.articles.index(userConnection, {
      body: {
        discussion_board_user_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyResults2);
  const pagination2 = emptyResults2.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination records should be 0 for non-existent author",
    pagination2.records,
    0,
  );
  TestValidator.equals(
    "data array should be empty for non-existent author",
    emptyResults2.data.length,
    0,
  );
  // Search for article with non-existent section
  const emptyResults3: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.user.articles.index(userConnection, {
      body: {
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyResults3);
  const pagination3 = emptyResults3.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination records should be 0 for non-existent section",
    pagination3.records,
    0,
  );
  TestValidator.equals(
    "data array should be empty for non-existent section",
    emptyResults3.data.length,
    0,
  );
  // Search for article with impossible date range (future date)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString();
  const emptyResults4: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.user.articles.index(userConnection, {
      body: {
        created_at_start: futureDate satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyResults4);
  const pagination4 = emptyResults4.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination records should be 0 for future date",
    pagination4.records,
    0,
  );
  TestValidator.equals(
    "data array should be empty for future date",
    emptyResults4.data.length,
    0,
  );
  // Validate all responses have consistent pagination structure even with zero results
  const allPaginations = [pagination1, pagination2, pagination3, pagination4];
  for (const pagination of allPaginations) {
    TestValidator.equals(
      "page limit should be as requested",
      pagination.limit,
      10,
    );
    TestValidator.predicate(
      "current page should be 0 or 1",
      pagination.current === 0 || pagination.current === 1,
    );
    TestValidator.equals(
      "pages should be 0 when records is 0",
      pagination.pages,
      0,
    );
  }
}
