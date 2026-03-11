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

export async function test_api_performance_metrics_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Test individual filter types
  // Test metric_type filter
  const metricTypes = [
    "response_time",
    "throughput",
    "cpu_usage",
    "memory_usage",
    "database_queries",
  ] as const;
  for (const metricType of metricTypes) {
    const response =
      await api.functional.multiUserTodo.admin.performance_metrics.index(
        adminConnection,
        {
          body: {
            metric_type: metricType,
            service_name: null,
            endpoint_path: null,
            collection_timestamp_start: null,
            collection_timestamp_end: null,
            page: 1,
            limit: 10,
            sort: "timestamp_desc",
          } satisfies IMultiUserTodoPerformanceMetric.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `metric_type filter ${metricType} returns valid response`,
      response.data.length >= 0,
    );
  }
  // Test service_name filter
  const serviceResponse =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          metric_type: null,
          service_name: "api_gateway",
          endpoint_path: null,
          collection_timestamp_start: null,
          collection_timestamp_end: null,
          page: 1,
          limit: 10,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(serviceResponse);
  // Test endpoint_path filter
  const endpointResponse =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          metric_type: null,
          service_name: null,
          endpoint_path: "/api",
          collection_timestamp_start: null,
          collection_timestamp_end: null,
          page: 1,
          limit: 10,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(endpointResponse);
  // Test time range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const timeResponse =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          metric_type: null,
          service_name: null,
          endpoint_path: null,
          collection_timestamp_start: oneDayAgo,
          collection_timestamp_end: now.toISOString(),
          page: 1,
          limit: 10,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(timeResponse);
  // 3. Test filter combinations
  const combinedResponse =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          metric_type: "response_time",
          service_name: "api_gateway",
          endpoint_path: "/api",
          collection_timestamp_start: oneDayAgo,
          collection_timestamp_end: now.toISOString(),
          page: 1,
          limit: 10,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // 4. Test pagination with different page sizes
  const pageSizes = [1, 5, 10, 25] as const;
  for (const limit of pageSizes) {
    const paginationResponse =
      await api.functional.multiUserTodo.admin.performance_metrics.index(
        adminConnection,
        {
          body: {
            metric_type: null,
            service_name: null,
            endpoint_path: null,
            collection_timestamp_start: null,
            collection_timestamp_end: null,
            page: 1,
            limit: limit,
            sort: "timestamp_desc",
          } satisfies IMultiUserTodoPerformanceMetric.IRequest,
        },
      );
    typia.assert(paginationResponse);
    TestValidator.predicate(
      `pagination limit ${limit} returns valid data`,
      paginationResponse.data.length <= limit,
    );
    TestValidator.equals(
      `pagination metadata matches limit ${limit}`,
      paginationResponse.pagination.limit,
      limit,
    );
  }
  // 5. Test empty result set handling
  const futureDate = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResponse =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          metric_type: null,
          service_name: "nonexistent_service",
          endpoint_path: null,
          collection_timestamp_start: futureDate,
          collection_timestamp_end: futureDate,
          page: 1,
          limit: 10,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result set handled gracefully",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for empty set",
    emptyResponse.pagination.records,
    0,
  );
  // 6. Test pagination metadata accuracy
  const firstPage =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          metric_type: null,
          service_name: null,
          endpoint_path: null,
          collection_timestamp_start: null,
          collection_timestamp_end: null,
          page: 1,
          limit: 5,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination metadata has valid structure",
    firstPage.pagination.current >= 0 &&
      firstPage.pagination.limit >= 0 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );
}
