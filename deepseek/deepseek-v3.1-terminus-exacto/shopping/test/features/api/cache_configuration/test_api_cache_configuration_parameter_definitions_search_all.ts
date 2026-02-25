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

export async function test_api_cache_configuration_parameter_definitions_search_all(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as random super administrator
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Search all parameter definitions without filters
  const response =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.index(
      superAdminConnection, // FIXED: Use authorized connection, not base connection
      {
        body: {
          // No filters applied to get all records
        } satisfies IEcommerceCacheConfigurationParameterDefinition.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  if (response.data.length > 0) {
    // Validate first item structure
    const firstItem = response.data[0];
    typia.assert(firstItem);
    TestValidator.predicate("has id field", typeof firstItem.id === "string");
    TestValidator.predicate(
      "has operation_type field",
      typeof firstItem.operation_type === "string",
    );
    TestValidator.predicate(
      "has created_at field",
      typeof firstItem.created_at === "string",
    );
    // Validate administrator reference structure
    TestValidator.equals(
      "administrator is an object",
      typeof firstItem.administrator,
      "object",
    );
    TestValidator.predicate(
      "administrator has id",
      typeof firstItem.administrator.id === "string",
    );
    TestValidator.predicate(
      "administrator has email",
      typeof firstItem.administrator.email === "string",
    );
    TestValidator.predicate(
      "administrator has created_at",
      typeof firstItem.administrator.created_at === "string",
    );
    // Validate category reference structure
    TestValidator.equals(
      "category is an object",
      typeof firstItem.category,
      "object",
    );
    TestValidator.predicate(
      "category has id",
      typeof firstItem.category.id === "string",
    );
    TestValidator.predicate(
      "category has name",
      typeof firstItem.category.name === "string",
    );
    TestValidator.predicate(
      "category has created_at",
      typeof firstItem.category.created_at === "string",
    );
    TestValidator.predicate(
      "category has products_count",
      typeof firstItem.category.products_count === "number",
    );
  }
}
