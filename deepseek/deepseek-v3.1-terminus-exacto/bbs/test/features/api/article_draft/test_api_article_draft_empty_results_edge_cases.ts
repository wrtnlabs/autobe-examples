import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_article_draft_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Test 1: Search for non-existent title
  const nonExistentTitleResult =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          search_title: "nonexistent_random_title_that_should_not_exist",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(nonExistentTitleResult);
  TestValidator.equals(
    "zero records for non-existent title",
    nonExistentTitleResult.data.length,
    0,
  );
  // Test 2: Future date range that excludes any existing drafts
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Tomorrow
  const futureDateResult =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          draft_created_at_from: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(futureDateResult);
  TestValidator.equals(
    "empty data array for future date",
    futureDateResult.data.length,
    0,
  );
  // Test 3: Past date range that excludes recent creations
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365); // 1 year ago
  const earlyPastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 730); // 2 years ago
  const pastDateRangeResult =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          draft_created_at_from: earlyPastDate.toISOString(),
          draft_created_at_to: pastDate.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(pastDateRangeResult);
  TestValidator.equals(
    "empty data array for past date range",
    pastDateRangeResult.data.length,
    0,
  );
  // Test 4: Invalid status value
  const invalidStatusResult =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          status: "invalid_status_that_does_not_exist",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(invalidStatusResult);
  TestValidator.equals(
    "empty data array for invalid status",
    invalidStatusResult.data.length,
    0,
  );
  // Test 5: Combination of multiple filters that guarantee no results
  const combinationResult =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          search_title: "nonexistent",
          search_content: "nonexistent",
          status: "published", // Assuming no published drafts exist
          draft_created_at_from: futureDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(combinationResult);
  TestValidator.equals(
    "empty data array for combined filters",
    combinationResult.data.length,
    0,
  );
  // Test 6: Different pagination parameters with empty results
  const page2Result =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          search_title: "guaranteed_empty_results",
          page: 2, // Should handle higher pages gracefully
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 has empty data array",
    page2Result.data.length,
    0,
  );
}
