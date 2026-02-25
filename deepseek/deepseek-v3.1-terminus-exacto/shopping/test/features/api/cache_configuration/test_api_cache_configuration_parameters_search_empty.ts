import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
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
import { generate_random_ecommerce_super_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";

export async function test_api_cache_configuration_parameters_search_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Create cache configuration (no parameters added)
  const config =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {},
    );
  typia.assert(config);
  // 3. Search with default pagination (no filters)
  const defaultSearch =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {} satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate empty results with correct pagination
  TestValidator.equals(
    "default search records zero",
    defaultSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "default search pages zero",
    defaultSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default search current page",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "default search data empty",
    defaultSearch.data.length,
    0,
  );
  // 4. Search with metric_name filter (no match)
  const nameSearch =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          metric_name: "test_parameter",
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(nameSearch);
  TestValidator.equals(
    "name filter records zero",
    nameSearch.pagination.records,
    0,
  );
  TestValidator.equals("name filter data empty", nameSearch.data.length, 0);
  // 5. Search with metric_category filter (no match)
  const categorySearch =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          metric_category: "performance",
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(categorySearch);
  TestValidator.equals(
    "category filter records zero",
    categorySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "category filter data empty",
    categorySearch.data.length,
    0,
  );
  // 6. Search with date range filter
  const now = new Date().toISOString();
  const dateSearch =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          collection_timestamp_start: new Date(
            Date.now() - 86400000,
          ).toISOString(), // yesterday
          collection_timestamp_end: now,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(dateSearch);
  TestValidator.equals(
    "date filter records zero",
    dateSearch.pagination.records,
    0,
  );
  TestValidator.equals("date filter data empty", dateSearch.data.length, 0);
  // 7. Search with is_aggregated filter
  const aggregatedSearch =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          is_aggregated: true,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(aggregatedSearch);
  TestValidator.equals(
    "aggregated filter records zero",
    aggregatedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "aggregated filter data empty",
    aggregatedSearch.data.length,
    0,
  );
  // 8. Search with combination of filters (should still return empty)
  const combinedSearch =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: config.id,
        body: {
          metric_name: "test",
          metric_category: "usage",
          collection_timestamp_start: new Date(
            Date.now() - 604800000,
          ).toISOString(), // 7 days ago
          is_aggregated: false,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined filter records zero",
    combinedSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter data empty",
    combinedSearch.data.length,
    0,
  );
}
