import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_admin_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // 2. Test empty search with non-existent operation type
  const nonExistentOperationSearch =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          operation_type: "non_existent_operation_type",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(nonExistentOperationSearch);
  // Validate empty results with proper pagination
  TestValidator.equals(
    "page should be 1",
    nonExistentOperationSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    nonExistentOperationSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "records should be 0",
    nonExistentOperationSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0",
    nonExistentOperationSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    nonExistentOperationSearch.data.length,
    0,
  );
  // 3. Test search with non-existent administrator ID
  const nonExistentAdminSearch =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          administrator_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(nonExistentAdminSearch);
  TestValidator.equals(
    "should have zero records for non-existent admin",
    nonExistentAdminSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "should have empty data array",
    nonExistentAdminSearch.data.length,
    0,
  );
  // 4. Test search with non-existent category ID
  const nonExistentCategorySearch =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(nonExistentCategorySearch);
  TestValidator.equals(
    "should have zero records for non-existent category",
    nonExistentCategorySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "should have empty data array",
    nonExistentCategorySearch.data.length,
    0,
  );
  // 5. Test search with unmatchable date range (far future)
  const farFutureSearch =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 365,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(farFutureSearch);
  TestValidator.equals(
    "should have zero records for future date range",
    farFutureSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "should have empty data array",
    farFutureSearch.data.length,
    0,
  );
  // 6. Test search with unmatchable text content
  const unmatchableTextSearch =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          search: "xyz123abc789unmatchablecontent",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(unmatchableTextSearch);
  TestValidator.equals(
    "should have zero records for unmatchable text",
    unmatchableTextSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "should have empty data array",
    unmatchableTextSearch.data.length,
    0,
  );
  // 7. Test combined filters that should produce no results
  const combinedNoResultsSearch =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          operation_type: "non_existent_type",
          administrator_id: typia.random<string & tags.Format<"uuid">>(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          created_at_from: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 365,
          ).toISOString(),
          search: "unmatchablequery",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(combinedNoResultsSearch);
  TestValidator.equals(
    "should have zero records with combined filters",
    combinedNoResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "should have empty data array",
    combinedNoResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should be consistent",
    combinedNoResultsSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be maintained",
    combinedNoResultsSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pages should be zero",
    combinedNoResultsSearch.pagination.pages,
    0,
  );
}
