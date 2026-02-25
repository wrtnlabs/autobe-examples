import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_cache_configuration_parameter_basic_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Step 2: Create cache configuration
  const cacheConfig =
    await api.functional.ecommerce.superAdministrator.cache_configurations.create(
      adminConnection,
      {
        body: {
          cache_key: "redis.session",
          cache_type: "redis",
          configuration_value: JSON.stringify({
            host: "localhost",
            port: 6379,
          }),
          description: "Session cache configuration",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(cacheConfig);
  // Step 3: Create parameter definition
  const paramDefinition =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.create(
      adminConnection,
      {
        body: {
          parameter_name: "session_timeout",
          data_type: "integer",
          description: "Session timeout in seconds",
          default_value: "3600",
          validation_rules: JSON.stringify({ min_value: 60, max_value: 86400 }),
          is_required: true,
          min_value: "60",
          max_value: "86400",
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(paramDefinition);
  // Step 4: Create parameter value for the configuration
  const parameterValue =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.create(
      adminConnection,
      {
        configId: cacheConfig.id,
        body: {
          ecommerce_cache_configuration_parameter_definition_id:
            paramDefinition.id,
          parameter_value: "7200",
        } satisfies IEcommerceCacheConfigurationParameter.ICreate,
      },
    );
  typia.assert(parameterValue);
  // Step 5: Validate the parameter creation
  TestValidator.equals(
    "parameter name matches definition",
    parameterValue.parameter_name,
    "session_timeout",
  );
  TestValidator.equals(
    "parameter value is correct",
    parameterValue.parameter_value,
    "7200",
  );
  TestValidator.equals(
    "data type matches definition",
    parameterValue.data_type,
    "integer",
  );
  TestValidator.predicate(
    "parameter has creation timestamp",
    !!parameterValue.created_at,
  );
  TestValidator.predicate(
    "parameter has valid description",
    parameterValue.description.length > 0,
  );
}
