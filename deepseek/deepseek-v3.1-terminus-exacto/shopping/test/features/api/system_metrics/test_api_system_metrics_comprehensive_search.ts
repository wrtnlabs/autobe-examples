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

export async function test_api_system_metrics_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create search request with comprehensive filters
  const dateTo = new Date("2024-03-01T00:00:00Z").toISOString();
  const dateFrom = new Date("2024-02-23T00:00:00Z").toISOString();
  const searchRequest: IEcommerceSystemMetric.IRequest = {
    metric_name: "api_response",
    environment: "staging",
    threshold_exceeded: false,
    date_from: dateFrom,
    date_to: dateTo,
    page: 1,
    limit: 20,
  };
  // 3. Execute the search with comprehensive filtering
  const result =
    await api.functional.ecommerce.superAdministrator.system_metrics.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(result);
  // 4. Validate pagination correctness
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    result.pagination.records >= 0,
  );
  // 5. Validate each returned metric matches the filter criteria
  if (result.data.length > 0) {
    result.data.forEach((metric, index) => {
      TestValidator.predicate(
        `metric ${index} should contain 'api_response' in name`,
        metric.metric_name.includes("api_response"),
      );
      TestValidator.equals(
        `metric ${index} should be from staging environment`,
        metric.environment,
        "staging",
      );
      TestValidator.equals(
        `metric ${index} should not exceed thresholds`,
        metric.threshold_exceeded,
        false,
      );
    });
  }
  // 6. Validate business logic: pagination limits and threshold filtering
  TestValidator.predicate(
    "data length should not exceed requested limit",
    result.data.length <= 20,
  );
  const hasExceededMetrics = result.data.some(
    (metric) => metric.threshold_exceeded === true,
  );
  TestValidator.equals(
    "should not include metrics exceeding thresholds when filtered for false",
    hasExceededMetrics,
    false,
  );
}
