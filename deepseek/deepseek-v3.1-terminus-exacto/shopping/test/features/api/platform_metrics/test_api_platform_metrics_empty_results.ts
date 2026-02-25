import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_metrics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test 1: Date range far in the future (no metrics exist)
  const futureDateRange =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      superAdminConnection,
      {
        body: {
          collection_timestamp_start: new Date(
            "2100-01-01T00:00:00.000Z",
          ).toISOString(),
          collection_timestamp_end: new Date(
            "2100-12-31T23:59:59.999Z",
          ).toISOString(),
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(futureDateRange);
  TestValidator.equals(
    "future date range has zero records",
    futureDateRange.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range has zero pages",
    futureDateRange.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date range has empty data array",
    futureDateRange.data.length,
    0,
  );
  // Test 2: Non-existent metric category
  const nonExistentCategory =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      superAdminConnection,
      {
        body: {
          metric_category: "non_existent_category_12345",
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(nonExistentCategory);
  TestValidator.equals(
    "non-existent category has zero records",
    nonExistentCategory.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent category has zero pages",
    nonExistentCategory.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent category has empty data array",
    nonExistentCategory.data.length,
    0,
  );
  // Test 3: Search pattern for non-existent metric name
  const nonExistentPattern =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      superAdminConnection,
      {
        body: {
          metric_name: "this_metric_name_does_not_exist_12345",
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(nonExistentPattern);
  TestValidator.equals(
    "non-existent pattern has zero records",
    nonExistentPattern.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent pattern has zero pages",
    nonExistentPattern.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent pattern has empty data array",
    nonExistentPattern.data.length,
    0,
  );
  // Test 4: Combination of contradictory filters
  const contradictoryFilters =
    await api.functional.ecommerce.superAdministrator.platform_metrics.index(
      superAdminConnection,
      {
        body: {
          metric_name: "active_users",
          metric_category: "non_existent_category",
          collection_timestamp_start: new Date(
            "2020-01-01T00:00:00.000Z",
          ).toISOString(),
          collection_timestamp_end: new Date(
            "2020-01-02T00:00:00.000Z",
          ).toISOString(),
          is_aggregated: true,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(contradictoryFilters);
  TestValidator.equals(
    "contradictory filters have zero records",
    contradictoryFilters.pagination.records,
    0,
  );
  TestValidator.equals(
    "contradictory filters have zero pages",
    contradictoryFilters.pagination.pages,
    0,
  );
  TestValidator.equals(
    "contradictory filters have empty data array",
    contradictoryFilters.data.length,
    0,
  );
}
