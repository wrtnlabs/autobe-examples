import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_efficiency_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using correct utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // Generate date ranges for moderation efficiency testing
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Test 1: Comprehensive moderation efficiency with full date range
  const comprehensiveRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    registration_date_start: oneMonthAgo.toISOString(),
    registration_date_end: now.toISOString(),
    last_activity_start: oneMonthAgo.toISOString(),
    last_activity_end: now.toISOString(),
    page: 1,
    limit: 10,
    sort_by: "last_activity",
    sort_order: "desc",
  };
  const comprehensiveResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      { body: comprehensiveRequest },
    );
  typia.assert(comprehensiveResponse);
  // Test 2: Recent moderation activity filtering
  const recentModerationRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    last_activity_start: oneWeekAgo.toISOString(),
    last_activity_end: now.toISOString(),
    min_articles: 0,
    min_comments: 0,
    page: 1,
    limit: 5,
    sort_by: "article_count",
    sort_order: "desc",
  };
  const recentModerationResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      { body: recentModerationRequest },
    );
  typia.assert(recentModerationResponse);
  // Test 3: Historical moderation patterns
  const historicalModerationRequest: IDiscussionBoardPerformanceMetric.IRequest =
    {
      registration_date_start: oneMonthAgo.toISOString(),
      registration_date_end: twoWeeksAgo.toISOString(),
      min_articles: 1,
      min_comments: 1,
      page: 1,
      limit: 15,
      sort_by: "registration_date",
      sort_order: "asc",
    };
  const historicalModerationResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      { body: historicalModerationRequest },
    );
  typia.assert(historicalModerationResponse);
  // Validate moderation efficiency response structure
  TestValidator.equals(
    "pagination exists",
    typeof comprehensiveResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "valid current page",
    comprehensiveResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "valid limit range",
    comprehensiveResponse.pagination.limit >= 1 &&
      comprehensiveResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "non-negative records",
    comprehensiveResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "non-negative pages",
    comprehensiveResponse.pagination.pages >= 0,
  );
  // Validate moderation efficiency data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(comprehensiveResponse.data),
    true,
  );
  TestValidator.predicate(
    "data length within limit",
    comprehensiveResponse.data.length <= comprehensiveResponse.pagination.limit,
  );
  // Test pagination boundaries
  const boundaryRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    registration_date_start: oneMonthAgo.toISOString(),
    registration_date_end: now.toISOString(),
    page: 1,
    limit: 1,
  };
  const boundaryResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      { body: boundaryRequest },
    );
  typia.assert(boundaryResponse);
  TestValidator.equals(
    "boundary limit respected",
    boundaryResponse.pagination.limit,
    1,
  );
  // Test maximum pagination limit for moderation efficiency
  const maxLimitRequest: IDiscussionBoardPerformanceMetric.IRequest = {
    registration_date_start: oneMonthAgo.toISOString(),
    registration_date_end: now.toISOString(),
    page: 1,
    limit: 100,
  };
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      { body: maxLimitRequest },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit enforced",
    maxLimitResponse.pagination.limit,
    100,
  );
}
