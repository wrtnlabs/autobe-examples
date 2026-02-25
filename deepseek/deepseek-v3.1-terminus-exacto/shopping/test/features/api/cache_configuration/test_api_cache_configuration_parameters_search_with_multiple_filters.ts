import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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
import { generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create";
import { generate_random_ecommerce_super_administrator_cache_configurations_parameters_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameters_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { prepare_random_ecommerce_cache_configuration_parameter } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_configuration_parameters_search_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123456789",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create cache configuration
  const cacheConfig =
    await generate_random_ecommerce_super_administrator_cache_configurations_create(
      superAdminConnection,
      {
        body: {
          cache_key: "redis.session",
          cache_type: "redis",
          configuration_value: JSON.stringify({ ttl: 3600, max_memory: "1GB" }),
          description: "Session cache configuration",
          is_active: true,
          priority: 5,
        },
      },
    );
  typia.assert(cacheConfig);
  // Create parameter definitions
  const paramDef1 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      {
        body: {
          parameter_name: "max_connections",
          data_type: "integer",
          description: "Maximum number of concurrent connections",
          default_value: "100",
          is_required: true,
          min_value: "1",
          max_value: "1000",
        },
      },
    );
  typia.assert(paramDef1);
  const paramDef2 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      {
        body: {
          parameter_name: "timeout_ms",
          data_type: "integer",
          description: "Connection timeout in milliseconds",
          default_value: "5000",
          is_required: false,
          min_value: "0",
          max_value: "30000",
        },
      },
    );
  typia.assert(paramDef2);
  const paramDef3 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      {
        body: {
          parameter_name: "compression_enabled",
          data_type: "boolean",
          description: "Enable data compression",
          default_value: "true",
          is_required: false,
        },
      },
    );
  typia.assert(paramDef3);
  // Add parameters to cache configuration
  const param1 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          ecommerce_cache_configuration_parameter_definition_id: paramDef1.id,
          parameter_value: "250",
        },
      },
    );
  typia.assert(param1);
  const param2 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          ecommerce_cache_configuration_parameter_definition_id: paramDef2.id,
          parameter_value: "10000",
        },
      },
    );
  typia.assert(param2);
  const param3 =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameters_create(
      superAdminConnection,
      {
        params: { configId: cacheConfig.id },
        body: {
          ecommerce_cache_configuration_parameter_definition_id: paramDef3.id,
          parameter_value: "false",
        },
      },
    );
  typia.assert(param3);
  // Test basic search without filters (should return all parameters)
  const searchResults1 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: cacheConfig.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(searchResults1);
  TestValidator.predicate(
    "empty search returns all parameters",
    searchResults1.data.length >= 3,
  );
  // Test pagination with small limit
  const searchResults2 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: cacheConfig.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(searchResults2);
  TestValidator.equals("pagination limit works", searchResults2.data.length, 2);
  TestValidator.predicate(
    "has valid pagination metadata",
    searchResults2.pagination.records >= 3,
  );
  TestValidator.predicate(
    "has valid pages count",
    searchResults2.pagination.pages >= 2,
  );
  // Test pagination with second page
  const searchResults3 =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.index(
      superAdminConnection,
      {
        configId: cacheConfig.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceCacheConfigurationParameter.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.predicate(
    "second page returns remaining parameters",
    searchResults3.data.length >= 1,
  );
  // Validate pagination metadata consistency
  TestValidator.equals(
    "total records consistent",
    searchResults1.pagination.records,
    searchResults2.pagination.records,
  );
  TestValidator.equals(
    "page limits consistent",
    searchResults1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "small page limit applied",
    searchResults2.pagination.limit,
    2,
  );
}
