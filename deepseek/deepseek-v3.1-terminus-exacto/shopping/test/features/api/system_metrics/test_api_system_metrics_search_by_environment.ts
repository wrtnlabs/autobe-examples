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

export async function test_api_system_metrics_search_by_environment(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use API function directly since authorize_super_administrator_join utility is not available
  await api.functional.ecommerce.auth.superAdministrator.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  // Configure search parameters for production environment metrics from last 24 hours
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const searchParams = {
    environment: "production",
    date_from: yesterday.toISOString(),
    date_to: now.toISOString(),
    page: 1,
    limit: 10,
  };
  // Execute search for production environment metrics
  const productionMetrics =
    await api.functional.ecommerce.superAdministrator.system_metrics.index(
      superAdminConnection,
      { body: searchParams },
    );
  typia.assert(productionMetrics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof productionMetrics.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page valid",
    productionMetrics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit valid",
    productionMetrics.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count valid",
    productionMetrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    productionMetrics.pagination.pages >= 0,
  );
  // Validate data array structure and production environment filtering
  if (productionMetrics.data.length > 0) {
    for (const metric of productionMetrics.data) {
      TestValidator.equals(
        "environment is production",
        metric.environment,
        "production",
      );
      TestValidator.predicate("metric name exists", !!metric.metric_name);
      TestValidator.predicate(
        "metric category exists",
        !!metric.metric_category,
      );
      TestValidator.predicate(
        "metric value exists",
        typeof metric.metric_value === "number",
      );
      TestValidator.predicate("metric unit exists", !!metric.metric_unit);
      TestValidator.predicate(
        "source component exists",
        !!metric.source_component,
      );
      TestValidator.predicate(
        "threshold exceeded is boolean",
        typeof metric.threshold_exceeded === "boolean",
      );
    }
  }
  // Test threshold filtering for exceeded metrics
  const thresholdParams = {
    ...searchParams,
    threshold_exceeded: true,
  };
  const exceededMetrics =
    await api.functional.ecommerce.superAdministrator.system_metrics.index(
      superAdminConnection,
      { body: thresholdParams },
    );
  typia.assert(exceededMetrics);
  // Validate threshold filtering if results exist
  if (exceededMetrics.data.length > 0) {
    for (const metric of exceededMetrics.data) {
      TestValidator.predicate(
        "threshold exceeded is true",
        metric.threshold_exceeded === true,
      );
    }
  }
}
