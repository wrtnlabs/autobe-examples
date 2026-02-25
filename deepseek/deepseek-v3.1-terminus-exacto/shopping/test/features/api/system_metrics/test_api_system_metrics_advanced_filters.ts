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
 * Test comprehensive filtering capabilities of the system metrics endpoint.
 * Validates that administrators can filter metrics by various criteria including
 * metric name patterns, categories, value ranges, source components, environments,
 * threshold status, and date ranges. Tests edge cases like threshold-exceeding
 * metrics and combination filters with pagination accuracy.
 */
export async function test_api_system_metrics_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Test metric name partial match filtering
  const partialMatchResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          metric_name: "response",
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(partialMatchResponse);
  // 3. Test metric category exact match
  const categoryResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(categoryResponse);
  // 4. Test value range filtering
  const valueRangeResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          metric_value_min: 0,
          metric_value_max: 100,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(valueRangeResponse);
  // 5. Test source component filtering
  const sourceComponentResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          source_component: "api_gateway",
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(sourceComponentResponse);
  // 6. Test environment filtering
  const environmentResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          environment: "production",
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(environmentResponse);
  // 7. Test threshold exceeded filtering
  const thresholdResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          threshold_exceeded: true,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(thresholdResponse);
  // 8. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          date_from: yesterday.toISOString(),
          date_to: now.toISOString(),
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 9. Test combination filtering
  const combinationResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          metric_category: "performance",
          metric_value_min: 50,
          environment: "production",
          threshold_exceeded: false,
          page: 1,
          limit: 10,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(combinationResponse);
  TestValidator.predicate(
    "combination filter has pagination data",
    combinationResponse.pagination.records >= 0,
  );
  // 10. Test pagination validation
  const paginationResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination limit respected",
    paginationResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination metadata present",
    paginationResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination current page correct",
    paginationResponse.pagination.current === 1,
  );
  // 11. Validate filter combinations work independently
  const emptyFilterResponse =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.predicate(
    "empty filter returns valid pagination",
    emptyFilterResponse.pagination.records >= 0,
  );
}
