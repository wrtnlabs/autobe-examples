import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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
import { generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create } from "../../../generate/generate_random_ecommerce_administrator_cache_configurations_parameter_definitions_create";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_param_def_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "admin_password_123",
    } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator").IEcommerceAdministrator.IJoin,
  });
  // 2. Create a cache parameter definition
  const body = {
    parameter_name: RandomGenerator.alphabets(10),
    data_type: "integer",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    default_value: typia
      .random<number & typia.tags.Type<"uint32">>()
      .toString(),
    validation_rules: JSON.stringify({
      minimum: 0,
      maximum: typia.random<
        number & typia.tags.Type<"uint32"> & typia.tags.Minimum<1000>
      >(),
    }),
    is_required: typia.random<boolean>(),
    min_value: "0",
    max_value: typia
      .random<number & typia.tags.Type<"uint32"> & typia.tags.Minimum<1000>>()
      .toString(),
  } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate;
  const createdDefinition =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.create(
      adminConnection,
      { body },
    );
  typia.assert(createdDefinition);
  // 3. Retrieve the parameter definition by ID
  const retrievedDefinition =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.at(
      adminConnection,
      {
        definitionId: createdDefinition.id,
      },
    );
  typia.assert(retrievedDefinition);
  // 4. Validate the retrieved definition matches the created one
  // Use typia.assert to properly cast to ICreate type
  const createdDefinitionCreate = typia.assert<IEcommerceCacheConfigurationParameterDefinition.ICreate>(createdDefinition);
  const retrievedDefinitionCreate = typia.assert<IEcommerceCacheConfigurationParameterDefinition.ICreate>(retrievedDefinition);
  
  TestValidator.equals(
    "parameter_name matches",
    retrievedDefinitionCreate.parameter_name,
    createdDefinitionCreate.parameter_name,
  );
  TestValidator.equals(
    "data_type matches",
    retrievedDefinitionCreate.data_type,
    createdDefinitionCreate.data_type,
  );
  TestValidator.equals(
    "description matches",
    retrievedDefinitionCreate.description,
    createdDefinitionCreate.description,
  );
  TestValidator.equals(
    "default_value matches",
    retrievedDefinitionCreate.default_value,
    createdDefinitionCreate.default_value,
  );
  TestValidator.equals(
    "validation_rules matches",
    retrievedDefinitionCreate.validation_rules,
    createdDefinitionCreate.validation_rules,
  );
  TestValidator.equals(
    "is_required matches",
    retrievedDefinitionCreate.is_required,
    createdDefinitionCreate.is_required,
  );
  TestValidator.equals(
    "min_value matches",
    retrievedDefinitionCreate.min_value,
    createdDefinitionCreate.min_value,
  );
  TestValidator.equals(
    "max_value matches",
    retrievedDefinitionCreate.max_value,
    createdDefinitionCreate.max_value,
  );
  TestValidator.predicate(
    "created_at is present",
    !!retrievedDefinition.created_at,
  );
  TestValidator.predicate(
    "operation_type is present",
    !!retrievedDefinition.operation_type,
  );
}