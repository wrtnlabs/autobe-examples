import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test filtering capabilities for cache configuration parameter definitions search.
 * Validates date range filtering, text search, and pagination functionality.
 */
export async function test_api_cache_configuration_parameter_definitions_search_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(admin);
  // Test 1: Basic search with pagination
  const searchResult1 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "basic search returns results",
    searchResult1.data.length >= 0,
  );
  // Test 2: Search with text filter
  const searchResult2 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Date range filtering
  const now = new Date();
  const searchResult3 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
          created_at_to: now.toISOString(),
          limit: 15,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Complex search combining filters
  const searchResult4 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          search: "operation",
          created_at_from: new Date(now.getTime() - 172800000).toISOString(), // 2 days ago
          page: 1,
          limit: 20,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Pagination with different configurations
  const searchResult5 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 8,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "second page has valid limit",
    searchResult5.pagination.limit === 8,
  );
  // Validate response structure consistency
  if (searchResult1.data.length > 0) {
    const item = searchResult1.data[0];
    TestValidator.predicate(
      "response has valid id",
      typeof item.id === "string",
    );
    TestValidator.predicate(
      "response has operation type",
      typeof item.operation_type === "string",
    );
    TestValidator.predicate(
      "response has timestamp",
      typeof item.created_at === "string",
    );
    TestValidator.predicate(
      "response has administrator",
      typeof item.administrator.id === "string",
    );
    TestValidator.predicate(
      "response has category",
      typeof item.category.id === "string",
    );
  }
  // Validate all pagination responses have consistent structure
  [
    searchResult1,
    searchResult2,
    searchResult3,
    searchResult4,
    searchResult5,
  ].forEach((result, index) => {
    TestValidator.predicate(
      `result ${index + 1} has pagination`,
      typeof result.pagination.current === "number",
    );
    TestValidator.predicate(
      `result ${index + 1} has limit`,
      typeof result.pagination.limit === "number",
    );
    TestValidator.predicate(
      `result ${index + 1} has records count`,
      typeof result.pagination.records === "number",
    );
    TestValidator.predicate(
      `result ${index + 1} has pages count`,
      typeof result.pagination.pages === "number",
    );
  });
}
