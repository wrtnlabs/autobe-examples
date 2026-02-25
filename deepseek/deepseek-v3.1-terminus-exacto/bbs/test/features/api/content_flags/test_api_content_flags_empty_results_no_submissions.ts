import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_content_flags_empty_results_no_submissions(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate user via join
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test without filters - should return empty results
  const emptyResponse =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {} satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate empty data array
  TestValidator.equals("data array empty", emptyResponse.data, []);
  // Validate pagination metadata - navigate through nested pagination structure
  TestValidator.equals(
    "current page",
    emptyResponse.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit default",
    emptyResponse.pagination.pagination.pagination.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records",
    emptyResponse.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages",
    emptyResponse.pagination.pagination.pagination.pagination.pages,
    0,
  );
  // Test with status filter - should still return empty
  const statusResponse =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(statusResponse);
  TestValidator.equals("status filter empty data", statusResponse.data, []);
  // Test with date range filter - should still return empty
  const dateResponse =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          created_at_start: new Date(Date.now() - 86400000).toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(dateResponse);
  TestValidator.equals("date filter empty data", dateResponse.data, []);
  // Test with combined filters - should still return empty
  const combinedResponse =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          status: "resolved",
          created_at_start: new Date(Date.now() - 604800000).toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals("combined filter empty data", combinedResponse.data, []);
}
