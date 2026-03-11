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

export async function test_api_superadmin_analytics_filtered_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Construct analytics request with specific filters
  const analyticsRequest = {
    metric_type: "response_time",
    source_service: "api_gateway",
    status: "warning",
    start_timestamp: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    end_timestamp: new Date().toISOString(),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSystemHealthMetric.IRequest;
  // Execute filtered analytics query using super admin connection
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.administrations.analytics.index(
      superAdminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof analyticsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination properties",
    analyticsResponse.pagination.current !== undefined &&
      analyticsResponse.pagination.limit !== undefined &&
      analyticsResponse.pagination.records !== undefined &&
      analyticsResponse.pagination.pages !== undefined,
  );
  // Validate each returned metric matches filter criteria and has proper structure
  for (const metric of analyticsResponse.data) {
    TestValidator.equals(
      "metric type matches filter",
      metric.metric_type,
      "response_time",
    );
    TestValidator.equals(
      "source service matches filter",
      metric.source_service,
      "api_gateway",
    );
    TestValidator.equals("status matches filter", metric.status, "warning");
    // Validate metric data structure
    TestValidator.predicate(
      "metric_value is number",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate("unit is string", typeof metric.unit === "string");
    TestValidator.predicate(
      "collection_timestamp is valid",
      !isNaN(new Date(metric.collection_timestamp).getTime()),
    );
    // Validate timestamp is within range
    const metricTimestamp = new Date(metric.collection_timestamp).getTime();
    const startTime = new Date(analyticsRequest.start_timestamp!).getTime();
    const endTime = new Date(analyticsRequest.end_timestamp!).getTime();
    TestValidator.predicate(
      "timestamp within range",
      metricTimestamp >= startTime && metricTimestamp <= endTime,
    );
  }
  // Validate pagination parameters
  TestValidator.equals("page number", analyticsResponse.pagination.current, 1);
  TestValidator.equals("limit size", analyticsResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records count valid",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    analyticsResponse.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(analyticsResponse.data),
  );
}
