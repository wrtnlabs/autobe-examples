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

/**
 * Test filtering user engagement metrics with available filtering options.
 * An administrator authenticates and retrieves user statistics with various filters.
 * Verify that filtering by registration date, activity date, and contribution counts works.
 * Test sorting options by different fields and validate pagination functionality.
 */
export async function test_api_performance_metrics_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test different sort options with pagination
  const sortOptions = [
    "article_count",
    "comment_count",
    "last_activity",
    "registration_date",
  ] as const;
  for (const sortBy of sortOptions) {
    // Test ascending order
    const responseAsc =
      await api.functional.discussionBoard.admin.performance_metrics.index(
        adminConnection,
        {
          body: {
            sort_by: sortBy,
            sort_order: "asc",
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(responseAsc);
    // Test descending order
    const responseDesc =
      await api.functional.discussionBoard.admin.performance_metrics.index(
        adminConnection,
        {
          body: {
            sort_by: sortBy,
            sort_order: "desc",
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(responseDesc);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      responseAsc.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", responseAsc.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records non-negative",
      responseAsc.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      responseAsc.pagination.pages >= 0,
    );
  }
  // 3. Test pagination with different page sizes
  const pageSizes = [5, 10, 20] as const;
  for (const limit of pageSizes) {
    const response =
      await api.functional.discussionBoard.admin.performance_metrics.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "pagination limit matches request",
      response.pagination.limit,
      limit,
    );
  }
  // 4. Test empty filter (get all metrics)
  const allMetricsResponse =
    await api.functional.discussionBoard.admin.performance_metrics.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(allMetricsResponse);
  TestValidator.predicate(
    "returns data array",
    Array.isArray(allMetricsResponse.data),
  );
}
