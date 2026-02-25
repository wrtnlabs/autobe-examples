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

export async function test_api_content_flags_retrieve_user_submissions_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Note: Content flag creation endpoints are not available in the provided SDK.
  // The test will focus on testing the filtering functionality of the retrieval endpoint.
  // In a real scenario, flags would be created first using appropriate endpoints.
  // 2. Test retrieval without filters (should return all user's flags)
  const allFlags =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      { body: {} satisfies IDiscussionBoardContentFlag.IRequest },
    );
  typia.assert(allFlags);
  // 3. Test filter by status 'pending'
  const pendingFlags =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(pendingFlags);
  // 4. Test filter by created date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const recentFlags =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          created_at_start: yesterday,
          created_at_end: tomorrow,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(recentFlags);
  // 5. Test multiple combined filters
  const combinedFilters =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          status: "pending",
          created_at_start: yesterday,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // 6. Validate pagination metadata exists
  TestValidator.predicate("pagination metadata exists", () => {
    return (
      allFlags.pagination !== undefined &&
      combinedFilters.pagination !== undefined
    );
  });
  // 7. Validate flag summaries have correct structure
  if (allFlags.data.length > 0) {
    const flag = allFlags.data[0];
    TestValidator.predicate("flag has required properties", () => {
      return (
        flag.id !== undefined &&
        flag.flagReason !== undefined &&
        flag.status !== undefined &&
        flag.createdAt !== undefined &&
        flag.resolvedAt !== undefined &&
        flag.reporter !== undefined
      );
    });
    // 8. Validate reporter ID matches authenticated user
    TestValidator.equals(
      "reporter ID matches authenticated user",
      flag.reporter.id,
      user.id,
    );
  }
  // 9. Test pagination parameters work correctly
  const paginatedResult =
    await api.functional.discussionBoard.user.content_flags.my_flags.index(
      userConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate("pagination limit is respected", () => {
    return paginatedResult.data.length <= 2;
  });
}
