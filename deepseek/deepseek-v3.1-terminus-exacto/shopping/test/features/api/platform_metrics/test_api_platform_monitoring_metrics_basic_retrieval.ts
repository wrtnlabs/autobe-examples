import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_monitoring_metrics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {});
  typia.assert(authorized);
  // Step 2: Retrieve platform monitoring metrics with default pagination (empty request)
  const page =
    await api.functional.ecommerce.administrator.platform_monitoring_metrics.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(page);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    page.pagination !== undefined,
  );
  TestValidator.equals("current page should be 1", page.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive number",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", page.pagination.pages >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    page.pagination.pages ===
      Math.ceil(page.pagination.records / page.pagination.limit),
  );
  // Step 4: Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(page.data));
  TestValidator.predicate(
    "data length matches limit",
    page.data.length <= page.pagination.limit,
  );
  // Step 5: Validate each metric object in data array
  for (const metric of page.data) {
    typia.assert(metric);
    TestValidator.predicate("id is UUID", /^[0-9a-f-]{36}$/i.test(metric.id));
    TestValidator.predicate(
      "metric_name is string",
      typeof metric.metric_name === "string",
    );
    TestValidator.predicate(
      "metric_value is number",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      "metric_unit is string or null",
      metric.metric_unit === null || typeof metric.metric_unit === "string",
    );
    TestValidator.predicate(
      "collection_timestamp is ISO string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.collection_timestamp),
    );
    TestValidator.predicate(
      "metric_category is string",
      typeof metric.metric_category === "string",
    );
    TestValidator.predicate(
      "is_aggregated is boolean",
      typeof metric.is_aggregated === "boolean",
    );
  }
}
