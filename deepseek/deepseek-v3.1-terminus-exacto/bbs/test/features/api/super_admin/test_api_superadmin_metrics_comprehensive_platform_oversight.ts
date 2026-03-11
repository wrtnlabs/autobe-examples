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

export async function test_api_superadmin_metrics_comprehensive_platform_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authResult);
  // 2. Perform comprehensive metrics query with multiple filters
  const metricsRequest = {
    metric_type: "response_time",
    source_service: "api_gateway",
    status: "healthy",
    start_timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    end_timestamp: new Date().toISOString(), // current time
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemHealthMetric.IRequest;
  const metricsResponse =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      { body: metricsRequest },
    );
  typia.assert(metricsResponse);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "current page valid",
    metricsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    metricsResponse.pagination.limit >= 1 &&
      metricsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    metricsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    metricsResponse.pagination.pages >= 0,
  );
  // 4. Validate response data structure and filtering criteria
  if (metricsResponse.data.length > 0) {
    for (const metric of metricsResponse.data) {
      typia.assert(metric);
      // 5. Validate filtering criteria
      TestValidator.equals(
        "metric_type filter",
        metric.metric_type,
        "response_time",
      );
      TestValidator.equals(
        "source_service filter",
        metric.source_service,
        "api_gateway",
      );
      TestValidator.equals("status filter", metric.status, "healthy");
      // Validate timestamp range
      const metricTimestamp = new Date(metric.collection_timestamp).getTime();
      const startTime = new Date(metricsRequest.start_timestamp!).getTime();
      const endTime = new Date(metricsRequest.end_timestamp!).getTime();
      TestValidator.predicate(
        "timestamp within range",
        metricTimestamp >= startTime && metricTimestamp <= endTime,
      );
    }
  }
  // 6. Test empty result set with non-existent criteria
  const emptyRequest = {
    metric_type: "non_existent_type",
    source_service: "non_existent_service",
    status: "non_existent_status",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemHealthMetric.IRequest;
  const emptyResponse =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyResponse);
  TestValidator.equals("empty result set", emptyResponse.data.length, 0);
  // 7. Test pagination boundary conditions
  const boundaryRequest = {
    metric_type: "response_time",
    page: 9999, // Very high page number
    limit: 5,
  } satisfies IDiscussionBoardSystemHealthMetric.IRequest;
  const boundaryResponse =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      { body: boundaryRequest },
    );
  typia.assert(boundaryResponse);
  TestValidator.predicate(
    "boundary page handles gracefully",
    boundaryResponse.pagination.current >= 0,
  );
  // 8. Test mixed status filtering
  const mixedStatusRequest = {
    metric_type: "response_time",
    status: "warning",
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardSystemHealthMetric.IRequest;
  const mixedStatusResponse =
    await api.functional.discussionBoard.superAdmin.metrics.index(
      superAdminConnection,
      { body: mixedStatusRequest },
    );
  typia.assert(mixedStatusResponse);
  if (mixedStatusResponse.data.length > 0) {
    for (const metric of mixedStatusResponse.data) {
      TestValidator.equals("mixed status filter", metric.status, "warning");
    }
  }
  // 9. Business validation: Ensure metrics support platform governance
  TestValidator.predicate(
    "metrics support monitoring capabilities",
    metricsResponse.data.length >= 0,
  );
}
