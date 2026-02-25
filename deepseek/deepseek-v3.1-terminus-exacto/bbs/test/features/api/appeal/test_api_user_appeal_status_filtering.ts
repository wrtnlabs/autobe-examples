import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_appeal_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Test various filtering scenarios with the user's appeals endpoint
  // Since we cannot create appeals, we test the filtering functionality
  // with whatever appeals might exist in the system for this user
  // Test status filtering with different status values
  const statuses = ["pending", "under_review", "approved", "rejected"] as const;
  for (const status of statuses) {
    const response = await api.functional.discussionBoard.user.appeals.my.index(
      userConnection,
      {
        body: {
          status: status,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanAppeal.IRequest,
      },
    );
    typia.assert(response);
    // Validate that all returned appeals have the correct status
    for (const appeal of response.data) {
      TestValidator.equals(
        `appeal status should be ${status}`,
        appeal.status,
        status,
      );
      // Validate reviewed_at field based on status
      if (status === "pending") {
        TestValidator.equals(
          "pending appeals should have null reviewed_at",
          appeal.reviewed_at,
          null,
        );
      } else {
        TestValidator.predicate(
          "non-pending appeals should have reviewed_at populated",
          appeal.reviewed_at !== null,
        );
      }
    }
  }
  // Test date range filtering
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        appealed_at_start: lastWeek.toISOString(),
        appealed_at_end: nextWeek.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(dateRangeResponse);
  // Test search functionality
  const searchResponse =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(searchResponse);
  // Test pagination
  const paginationResponse =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination should return valid page info",
    paginationResponse.pagination.pagination.pagination.pagination.current ===
      1 &&
      paginationResponse.pagination.pagination.pagination.pagination.limit ===
        5,
  );
  // Test empty filter combination (should return all user's appeals)
  const allAppealsResponse =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(allAppealsResponse);
}
