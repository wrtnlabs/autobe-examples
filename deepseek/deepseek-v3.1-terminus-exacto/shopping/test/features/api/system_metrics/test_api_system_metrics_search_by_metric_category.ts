import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_metrics_search_by_metric_category(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join endpoint
  const authResult = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(authResult);
  // Test 1: Search for performance metrics from api_gateway
  const searchRequest1: IEcommerceSystemMetric.IRequest = {
    metric_category: "performance",
    source_component: "api_gateway",
    page: 1,
    limit: 10,
  };
  const response1 =
    await api.functional.ecommerce.superAdministrator.system_metrics.index(
      adminConnection,
      { body: searchRequest1 },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response1.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response1.pagination.pages >= 0,
  );
  // Validate each metric record matches filter criteria
  for (const metric of response1.data) {
    typia.assert(metric);
    TestValidator.equals(
      "metric category should be performance",
      metric.metric_category,
      "performance",
    );
    TestValidator.equals(
      "source component should be api_gateway",
      metric.source_component,
      "api_gateway",
    );
  }
  // Test 2: Search with value range filtering
  const searchRequest2: IEcommerceSystemMetric.IRequest = {
    metric_category: "performance",
    source_component: "api_gateway",
    metric_value_min: 0,
    metric_value_max: 1000,
    page: 1,
    limit: 5,
  };
  const response2 =
    await api.functional.ecommerce.superAdministrator.system_metrics.index(
      adminConnection,
      { body: searchRequest2 },
    );
  typia.assert(response2);
  // Validate metric values are within specified range
  for (const metric of response2.data) {
    TestValidator.predicate(
      "metric value should be >= min",
      metric.metric_value >= 0,
    );
    TestValidator.predicate(
      "metric value should be <= max",
      metric.metric_value <= 1000,
    );
  }
  // Test 3: Verify filtering works (should return different results for different categories)
  const searchRequest3: IEcommerceSystemMetric.IRequest = {
    metric_category: "availability",
    source_component: "api_gateway",
    page: 1,
    limit: 5,
  };
  const response3 =
    await api.functional.ecommerce.superAdministrator.system_metrics.index(
      adminConnection,
      { body: searchRequest3 },
    );
  typia.assert(response3);
  // Verify that we get different metrics for different categories
  if (response1.data.length > 0 && response3.data.length > 0) {
    TestValidator.notEquals(
      "different categories should return different metrics",
      response1.data[0].metric_category,
      response3.data[0].metric_category,
    );
  }
}
