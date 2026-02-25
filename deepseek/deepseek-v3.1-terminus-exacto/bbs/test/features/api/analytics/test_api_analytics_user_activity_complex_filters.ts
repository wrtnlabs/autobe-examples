import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_analytics_user_activity_complex_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Test basic text search with activity_type
  const searchResult1 =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          search: "login",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search returns paginated results",
    searchResult1.data.length >= 0,
  );
  // 3. Test target_entity_type search
  const searchResult2 =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          search: "user",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(searchResult2);
  // 4. Test combined filters with activity_type and success_status
  const combinedResult1 =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          activity_type: "login",
          success_status: true,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(combinedResult1);
  // 5. Test date range filtering
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 6. Test null value handling for optional fields
  const nullFieldResult =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          target_entity_type: null,
          target_entity_id: null,
          success_status: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(nullFieldResult);
  // 7. Test complex combination with multiple filters
  const complexResult =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          activity_type: "article_create",
          target_entity_type: "article",
          success_status: true,
          created_at_from: dateFrom,
          search: "test",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(complexResult);
  // 8. Test pagination with different limit values
  const paginationTests = [1, 10, 50, 100] as const;
  for (const limit of paginationTests) {
    const paginationResult =
      await api.functional.discussionBoard.admin.analytics.user_activity.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    typia.assert(paginationResult);
    TestValidator.predicate(
      `pagination limit ${limit} returns valid results`,
      paginationResult.data.length >= 0 &&
        paginationResult.data.length <= limit,
    );
  }
  // 9. Test empty search criteria (should return all results)
  const emptySearchResult =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 10. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists",
    emptySearchResult.pagination !== undefined,
  );
}
