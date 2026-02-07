import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_performance_metric_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since there's no create endpoint for performance metrics in the provided API,
  // we'll test the retrieval endpoint with a valid UUID format to ensure it handles
  // the request properly (even if it returns 404)
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Test that the endpoint is accessible and returns a properly formatted response
  // Note: This may return 404 if the metric doesn't exist, but we're testing the
  // endpoint accessibility and response format validation
  const performanceMetric =
    await api.functional.discussionBoard.superAdmin.performance_metrics.at(
      superAdminConnection,
      {
        metricId: metricId,
      },
    );
  typia.assert(performanceMetric);
  // Validate the response structure
  TestValidator.equals("metric ID matches", performanceMetric.id, metricId);
  TestValidator.predicate(
    "metric type is string",
    typeof performanceMetric.metric_type === "string",
  );
  TestValidator.predicate(
    "metric value is number",
    typeof performanceMetric.metric_value === "number",
  );
  TestValidator.predicate(
    "metric unit is string",
    typeof performanceMetric.metric_unit === "string",
  );
  TestValidator.predicate(
    "source component is string",
    typeof performanceMetric.source_component === "string",
  );
  TestValidator.predicate(
    "time range is string",
    typeof performanceMetric.time_range === "string",
  );
  // Validate timestamp formats
  TestValidator.predicate(
    "collection timestamp is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      performanceMetric.collection_timestamp,
    ),
  );
  TestValidator.predicate(
    "created at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      performanceMetric.created_at,
    ),
  );
  TestValidator.predicate(
    "updated at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      performanceMetric.updated_at,
    ),
  );
  // Validate metadata can be null or string
  TestValidator.predicate(
    "metadata is string or null",
    performanceMetric.metadata === null ||
      typeof performanceMetric.metadata === "string",
  );
}
