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

/**
 * Test searching all parameters for a specific cache configuration.
 * 1. Authenticate as administrator
 * 2. Search parameters without filters to retrieve complete list
 * 3. Validate pagination metadata
 * 4. Verify all expected parameter fields are present
 * 5. Test configurable page sizes with different limit values
 */
export async function test_api_cache_configuration_parameter_search_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Generate a cache configuration ID for testing
  const configId = typia.random<string & tags.Format<"uuid">>();
  // 2. Search parameters without filters (retrieve complete list)
  const searchResult =
    await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
      adminConnection,
      {
        configId,
        body: {
          // No filters to get all parameters
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Verify all expected parameter fields are present for each parameter
  for (const parameter of searchResult.data) {
    typia.assert(parameter);
    // Validate required fields exist (using typia.assert already validates types)
    TestValidator.predicate("parameter has id", Boolean(parameter.id));
    TestValidator.predicate(
      "parameter has name",
      Boolean(parameter.parameter_name),
    );
    TestValidator.predicate(
      "parameter has value",
      Boolean(parameter.parameter_value),
    );
    TestValidator.predicate(
      "parameter has data type",
      Boolean(parameter.data_type),
    );
    TestValidator.predicate(
      "parameter has description",
      Boolean(parameter.description),
    );
    TestValidator.predicate(
      "parameter has created_at",
      Boolean(parameter.created_at),
    );
    // Validate that metadata from definitions table is properly joined
    TestValidator.predicate(
      "description is populated",
      parameter.description.length > 0,
    );
  }
  // 5. Test configurable page sizes with different limit values
  const testLimits = [5, 15, 25];
  for (const limit of testLimits) {
    const limitedResult =
      await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
        adminConnection,
        {
          configId,
          body: {
            page: 1,
            limit: limit,
          } satisfies IEcommerceCacheConfigurationParameter.IRequest,
        },
      );
    typia.assert(limitedResult);
    TestValidator.equals(
      `limit ${limit} is respected`,
      limitedResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `data length for limit ${limit} is correct`,
      limitedResult.data.length <= limit,
    );
  }
  // Test empty search with null/undefined filters (verify backend handles this properly)
  const emptySearchResult =
    await api.functional.ecommerce.administrator.cache_configurations.parameters.index(
      adminConnection,
      {
        configId,
        body: {
          metric_name: undefined,
          metric_category: undefined,
          collection_timestamp_start: undefined,
          collection_timestamp_end: undefined,
          is_aggregated: undefined,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(emptySearchResult);
}
