import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the basic system metrics retrieval functionality for administrators.
 *
 * Validates that an administrator can authenticate, access the system metrics endpoint,
 * and receive paginated results without filters. Verifies response contains expected
 * pagination metadata and metric summary fields.
 */
export async function test_api_system_metrics_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Call system metrics endpoint with empty request (no filters)
  const request: IEcommerceSystemMetric.IRequest = {
    // Empty request to get all metrics with default pagination
  };
  const response: IPageIEcommerceSystemMetric.ISummary =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    "current" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has limit",
    "limit" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has total records",
    "records" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has total pages",
    "pages" in response.pagination,
  );
  // 4. Validate pagination values are non-negative integers
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate metric summary structure for each returned item
  for (const metric of response.data) {
    typia.assert(metric);
    TestValidator.predicate(
      `metric has ID (${metric.id})`,
      typeof metric.id === "string" && metric.id.length > 0,
    );
    TestValidator.predicate(
      `metric has name (${metric.id})`,
      typeof metric.metric_name === "string",
    );
    TestValidator.predicate(
      `metric has category (${metric.id})`,
      typeof metric.metric_category === "string",
    );
    TestValidator.predicate(
      `metric has value (${metric.id})`,
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      `metric has unit (${metric.id})`,
      typeof metric.metric_unit === "string",
    );
    TestValidator.predicate(
      `metric has source component (${metric.id})`,
      typeof metric.source_component === "string",
    );
    TestValidator.predicate(
      `metric has environment (${metric.id})`,
      typeof metric.environment === "string",
    );
    TestValidator.predicate(
      `metric has threshold status (${metric.id})`,
      typeof metric.threshold_exceeded === "boolean",
    );
  }
  // 6. Validate pagination consistency
  if (response.pagination.limit > 0) {
    TestValidator.predicate(
      "data length does not exceed limit",
      response.data.length <= response.pagination.limit,
    );
  }
  // 7. Validate default sorting (most recent first - implicit via data validation)
  // The system should return metrics sorted by measurement timestamp descending
  // but we cannot validate timestamps since they're not in the summary view
  console.log(
    `Retrieved ${response.data.length} system metrics with pagination:`,
    {
      current: response.pagination.current,
      limit: response.pagination.limit,
      records: response.pagination.records,
      pages: response.pagination.pages,
    },
  );
}
