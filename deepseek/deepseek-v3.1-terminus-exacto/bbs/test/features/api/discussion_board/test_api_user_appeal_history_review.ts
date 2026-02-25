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

export async function test_api_user_appeal_history_review(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Call the target endpoint to retrieve user's appeal history
  const requestBody: IDiscussionBoardBanAppeal.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardBanAppeal.IRequest;
  const response = await api.functional.discussionBoard.user.appeals.my.index(
    userConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // Access the actual pagination metadata through the nested structure
  const pagination = response.pagination.pagination.pagination.pagination;
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is between 1-100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // Validate data array
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate each appeal summary structure
  for (const appeal of response.data) {
    // Validate appeal has required fields
    TestValidator.predicate("appeal has id", typeof appeal.id === "string");
    TestValidator.predicate(
      "appeal has appeal_reason",
      typeof appeal.appeal_reason === "string",
    );
    TestValidator.predicate(
      "appeal has status",
      typeof appeal.status === "string",
    );
    TestValidator.predicate(
      "appeal has appealed_at",
      typeof appeal.appealed_at === "string",
    );
    // Validate status is one of expected values
    const validStatuses = ["pending", "under_review", "approved", "rejected"];
    TestValidator.predicate(
      "appeal status is valid",
      validStatuses.includes(appeal.status),
    );
    // Validate user information matches authenticated user
    TestValidator.equals(
      "appeal user id matches authenticated user",
      appeal.user.id,
      user.id,
    );
    TestValidator.equals(
      "appeal user display_name matches",
      appeal.user.display_name,
      user.display_name,
    );
    // Validate timestamps are valid ISO strings
    TestValidator.predicate(
      "appealed_at is valid ISO date",
      !isNaN(new Date(appeal.appealed_at).getTime()),
    );
    if (appeal.reviewed_at !== null) {
      TestValidator.predicate(
        "reviewed_at is valid ISO date",
        !isNaN(new Date(appeal.reviewed_at).getTime()),
      );
    }
  }
  // Validate pagination calculations
  if (pagination.records > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculation is correct",
      pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals("empty records has zero pages", pagination.pages, 0);
  }
}
