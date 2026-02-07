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

export async function test_api_superadmin_analytics_sorting_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test all sorting combinations
  const sortFields = [
    "article_count",
    "comment_count",
    "last_activity",
    "registration_date",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;
  for (const sortField of sortFields) {
    for (const sortOrder of sortOrders) {
      const response =
        await api.functional.discussionBoard.superAdmin.analytics.index(
          superAdminConnection,
          {
            body: {
              sort_by: sortField,
              sort_order: sortOrder,
              limit: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<100>
              >(),
            } satisfies IDiscussionBoardPerformanceMetric.IRequest,
          },
        );
      typia.assert(response);
      // Validate pagination structure even if data is empty
      TestValidator.equals(
        "pagination structure present",
        typeof response.pagination,
        "object",
      );
      TestValidator.predicate(
        "pagination has current page",
        response.pagination.current >= 0,
      );
      TestValidator.predicate(
        "pagination has limit",
        response.pagination.limit >= 0,
      );
      TestValidator.predicate(
        "pagination has records",
        response.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination has pages",
        response.pagination.pages >= 0,
      );
    }
  }
  // Test default sorting (no sort parameters)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Test with empty result set filtering (high threshold that likely returns no results)
  const emptyResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          sort_by: "article_count",
          sort_order: "desc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result set has zero records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set has empty data array",
    emptyResponse.data.length,
    0,
  );
  // Test date range filtering with sorting
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 30,
          ).toISOString(), // 30 days ago
          registration_date_end: new Date().toISOString(),
          sort_by: "registration_date",
          sort_order: "desc",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
}
