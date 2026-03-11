import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoPerformanceMetric";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic performance metrics retrieval with minimal filtering.
 * Verify that administrators can access performance data with default
 * pagination settings and validate essential response fields.
 */
export async function test_api_performance_metrics_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: undefined });
  // 2. Create minimal request body with basic pagination (no filters)
  const requestBody = {
    metric_type: undefined,
    service_name: undefined,
    endpoint_path: undefined,
    collection_timestamp_start: undefined,
    collection_timestamp_end: undefined,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
    sort: "timestamp_desc" as const,
  } satisfies IMultiUserTodoPerformanceMetric.IRequest;
  // 3. Fetch performance metrics with minimal filtering
  const metrics =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(metrics);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "page should be 1",
    metrics.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "limit should be 10",
    metrics.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    metrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    metrics.pagination.pages >= 0,
  );
  // 5. Validate data structure if records exist
  if (metrics.data.length > 0) {
    for (const metric of metrics.data) {
      // Validate essential fields exist (typia.assert already validated types)
      TestValidator.predicate(
        "metric should have metric_type field",
        metric.metric_type !== undefined && metric.metric_type.length > 0,
      );
      TestValidator.predicate(
        "metric should have metric_value field",
        typeof metric.metric_value === "number",
      );
      TestValidator.predicate(
        "metric should have metric_unit field",
        metric.metric_unit !== undefined && metric.metric_unit.length > 0,
      );
      TestValidator.predicate(
        "metric should have service_name field",
        metric.service_name !== undefined && metric.service_name.length > 0,
      );
      TestValidator.predicate(
        "metric should have collection_timestamp field",
        metric.collection_timestamp !== undefined &&
          metric.collection_timestamp.length > 0,
      );
      TestValidator.predicate(
        "collection_timestamp should be valid ISO date",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
          metric.collection_timestamp,
        ),
      );
    }
  }
  // 6. Validate sorting by timestamp descending (newest first)
  if (metrics.data.length > 1) {
    for (let i = 1; i < metrics.data.length; i++) {
      const prevTime = new Date(metrics.data[i - 1].collection_timestamp);
      const currTime = new Date(metrics.data[i].collection_timestamp);
      TestValidator.predicate(
        "timestamps should be sorted descending (newest first)",
        prevTime >= currTime,
      );
    }
  }
}
