import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_comprehensive_platform_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Execute analytics query with pagination parameters to get comprehensive data
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.administrations.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate pagination metadata structure and logical constraints
  TestValidator.predicate(
    "pagination exists",
    analyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is non-negative",
    analyticsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    analyticsResponse.pagination.limit > 0 &&
      analyticsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records is non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    analyticsResponse.pagination.pages >= 0,
  );
  // Validate pagination logic: pages = ceil(records/limit)
  if (
    analyticsResponse.pagination.records > 0 &&
    analyticsResponse.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      analyticsResponse.pagination.records / analyticsResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      analyticsResponse.pagination.pages,
      expectedPages,
    );
  }
  // Validate data structure contains valid metric summaries
  if (analyticsResponse.data.length > 0) {
    for (const metric of analyticsResponse.data) {
      typia.assert(metric); // Validate each metric follows ISummary structure
      TestValidator.predicate(
        "metric has valid id",
        metric.id !== undefined && metric.id.length > 0,
      );
      TestValidator.predicate(
        "metric has valid type",
        metric.metric_type !== undefined && metric.metric_type.length > 0,
      );
      TestValidator.predicate(
        "metric has numeric value",
        typeof metric.metric_value === "number",
      );
      TestValidator.predicate(
        "metric has valid unit",
        metric.unit !== undefined && metric.unit.length > 0,
      );
      TestValidator.predicate(
        "metric has valid source service",
        metric.source_service !== undefined && metric.source_service.length > 0,
      );
      TestValidator.predicate(
        "metric has valid timestamp",
        metric.collection_timestamp !== undefined &&
          metric.collection_timestamp.length > 0,
      );
      TestValidator.predicate(
        "metric has valid status",
        metric.status !== undefined && metric.status.length > 0,
      );
    }
  }
  // Test business logic: analytics should provide actionable insights
  TestValidator.predicate(
    "analytics data structure is valid",
    Array.isArray(analyticsResponse.data),
  );
}
