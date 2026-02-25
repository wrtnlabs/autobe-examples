import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_search_status_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // Test 1: Search with used=true filter
  const usedTrueResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          used: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(usedTrueResponse);
  // Test 2: Search with used=false filter
  const usedFalseResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          used: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(usedFalseResponse);
  // Test 3: Search with used=null filter
  const usedNullResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          used: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(usedNullResponse);
  // Test 4: Search with expired=true filter
  const expiredTrueResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          expired: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(expiredTrueResponse);
  // Test 5: Search with expired=false filter
  const expiredFalseResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          expired: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(expiredFalseResponse);
  // Test 6: Search with expired=null filter
  const expiredNullResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          expired: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(expiredNullResponse);
  // Test 7: Combined filters (used=true & expired=false)
  const combinedResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          used: true,
          expired: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Test 8: Date range filters
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const dateRangeResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          created_at_start: pastDate.toISOString(),
          created_at_end: now.toISOString(),
          expired_at_start: now.toISOString(),
          expired_at_end: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 9: Email filter with pattern
  const emailResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(emailResponse);
  // Test 10: Pagination without filters
  const paginationResponse =
    await api.functional.discussionBoard.user.users.password_resets.index(
      userConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination structure with correct property names
  TestValidator.predicate(
    "pagination response has correct structure",
    paginationResponse.data instanceof Array &&
      typeof paginationResponse.pagination === "object" &&
      typeof (paginationResponse.pagination as any).current === "number" &&
      typeof (paginationResponse.pagination as any).limit === "number" &&
      typeof (paginationResponse.pagination as any).records === "number" &&
      typeof (paginationResponse.pagination as any).pages === "number",
  );
}