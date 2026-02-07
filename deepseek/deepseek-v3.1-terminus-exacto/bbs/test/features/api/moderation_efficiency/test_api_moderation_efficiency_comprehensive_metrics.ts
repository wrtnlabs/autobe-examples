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

export async function test_api_moderation_efficiency_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic request with default parameters
  const basicResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicResponse);
  // Test 2: Request with time range filters
  const timeRangeResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
          last_activity_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_end: new Date().toISOString(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(timeRangeResponse);
  // Test 3: Request with contribution thresholds
  const contributionResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
          min_comments: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(contributionResponse);
  // Test 4: Request with sorting
  const sortResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortResponse);
  // Test 5: Request with pagination
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Test 6: Comprehensive request with all filters
  const comprehensiveResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
          last_activity_start: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_end: new Date().toISOString(),
          min_articles: 1,
          min_comments: 5,
          sort_by: "last_activity",
          sort_order: "desc",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(comprehensiveResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    comprehensiveResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    comprehensiveResponse.pagination.limit >= 1 &&
      comprehensiveResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    comprehensiveResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    comprehensiveResponse.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(comprehensiveResponse.data),
  );
  // Validate pagination calculation consistency
  if (comprehensiveResponse.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation correct",
      comprehensiveResponse.pagination.pages ===
        Math.ceil(
          comprehensiveResponse.pagination.records /
            comprehensiveResponse.pagination.limit,
        ),
    );
  }
}
