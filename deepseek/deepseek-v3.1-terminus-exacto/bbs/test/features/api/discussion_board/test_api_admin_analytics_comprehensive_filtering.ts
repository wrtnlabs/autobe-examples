import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using the correct utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic analytics request without filters
  const basicResponse =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicResponse);
  TestValidator.predicate(
    "basic response has pagination",
    basicResponse.pagination !== undefined,
  );
  // Test 2: Filter by registration date range
  const registrationDateResponse =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(registrationDateResponse);
  // Test 3: Filter by last activity date range
  const activityDateResponse =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          last_activity_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_end: new Date().toISOString(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(activityDateResponse);
  // Test 4: Filter by minimum article and comment thresholds
  const thresholdResponse =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          min_articles: typia.random<
            number & typia.tags.Type<"int32"> & typia.tags.Minimum<0>
          >(),
          min_comments: typia.random<
            number & typia.tags.Type<"int32"> & typia.tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(thresholdResponse);
  // Test 5: Test different sorting criteria
  const sortCriteria = [
    "article_count",
    "comment_count",
    "last_activity",
    "registration_date",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;
  for (const sortBy of sortCriteria) {
    for (const sortOrder of sortOrders) {
      const sortedResponse =
        await api.functional.discussionBoard.admin.analytics.index(
          adminConnection,
          {
            body: {
              sort_by: sortBy,
              sort_order: sortOrder,
            } satisfies IDiscussionBoardPerformanceMetric.IRequest,
          },
        );
      typia.assert(sortedResponse);
    }
  }
  // Test 6: Test pagination with different settings
  const paginationTests = [
    { page: 1, limit: 10 },
    { page: 2, limit: 5 },
    { page: 1, limit: 20 },
  ];
  for (const pagination of paginationTests) {
    const paginatedResponse =
      await api.functional.discussionBoard.admin.analytics.index(
        adminConnection,
        {
          body: {
            page: pagination.page,
            limit: pagination.limit,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(paginatedResponse);
    TestValidator.equals(
      "page number matches",
      paginatedResponse.pagination.current,
      pagination.page,
    );
    TestValidator.equals(
      "limit matches",
      paginatedResponse.pagination.limit,
      pagination.limit,
    );
    TestValidator.predicate(
      "records count is non-negative",
      paginatedResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is non-negative",
      paginatedResponse.pagination.pages >= 0,
    );
  }
  // Test 7: Comprehensive filter combination
  const comprehensiveResponse =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
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
          sort_by: "article_count",
          sort_order: "desc",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(comprehensiveResponse);
  // Validate final response structure
  TestValidator.predicate(
    "has pagination object",
    comprehensiveResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(comprehensiveResponse.data),
  );
  TestValidator.equals(
    "page is 1",
    comprehensiveResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 15",
    comprehensiveResponse.pagination.limit,
    15,
  );
}
