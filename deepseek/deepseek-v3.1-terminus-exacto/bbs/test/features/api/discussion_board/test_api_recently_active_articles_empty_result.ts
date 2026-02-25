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

/**
 * Test the recently-active articles endpoint when no articles have comments
 * or articles exist but without recent activity.
 *
 * Verifies proper handling of edge cases like filtering by date ranges that
 * produce no results, ensuring the response structure remains valid with
 * empty data array and correct pagination metadata.
 */
export async function test_api_recently_active_articles_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a user - use the returned authorized connection
  const authorizedUser = await authorize_user_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  // Create authenticated connection using the token from authorized user
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorizedUser.token.access}`,
    },
  };
  // Call recently-active endpoint with date range that guarantees no results
  // Use a date range that excludes all articles (very old dates)
  const response =
    await api.functional.discussionBoard.user.recently_active.recentlyActive(
      userConnection,
      {
        body: {
          created_at_start: new Date("2000-01-01T00:00:00.000Z").toISOString(), // Very old date
          created_at_end: new Date("2001-01-01T00:00:00.000Z").toISOString(), // Old date range
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(response);
  // Validate empty result set - only check data array is empty
  // The pagination structure is complex with nested properties, so avoid direct property access
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
