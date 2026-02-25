import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_cache_configurations_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_create";
import { generate_random_ecommerce_administrator_cache_configurations_parameters_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_parameters_create";
import { prepare_random_ecommerce_cache_configuration } from "../../../prepare/prepare_random_ecommerce_cache_configuration";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_configuration_parameter_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Attempt unauthorized access - should fail
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.ecommerce.administrator.cache_configurations.parameters.at(
      connection,
      {
        configId: typia.random<string & tags.Format<"uuid">>(),
        parameterId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create cache configuration as prerequisite
  const config =
    await generate_random_ecommerce_administrator_cache_configurations_create(
      adminConnection,
      {
        body: {
          cache_key: "test.config",
          cache_type: "memory",
          configuration_value: JSON.stringify({ ttl: 3600 }),
          description: "Test configuration",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IEcommerceCacheConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // Create cache configuration parameter
  const parameter =
    await generate_random_ecommerce_administrator_cache_configurations_parameters_create(
      adminConnection,
      {
        params: { configId: config.id },
        body: {
          parameter_name: "ttl",
          data_type: "number",
          description: "Time to live in seconds",
          default_value: "3600",
          validation_rules: JSON.stringify({ type: "integer", minimum: 0 }),
          is_required: true,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(parameter);
  // Authorized access should succeed with proper response structure
  const accessedParameter =
    await api.functional.ecommerce.administrator.cache_configurations.parameters.at(
      adminConnection,
      {
        configId: config.id,
        parameterId: parameter.id,
      },
    );
  typia.assert(accessedParameter);
  // Validate parameter metadata is correctly returned
  TestValidator.equals(
    "parameter ID matches",
    accessedParameter.id,
    parameter.id,
  );
  TestValidator.equals(
    "parameter name matches",
    accessedParameter.parameter_name,
    "ttl",
  );
  TestValidator.equals(
    "data type matches",
    accessedParameter.data_type,
    "number",
  );
  TestValidator.predicate(
    "has description",
    accessedParameter.description.length > 0,
  );
  TestValidator.predicate(
    "creation timestamp valid",
    new Date(accessedParameter.created_at).getTime() > 0,
  );
}
