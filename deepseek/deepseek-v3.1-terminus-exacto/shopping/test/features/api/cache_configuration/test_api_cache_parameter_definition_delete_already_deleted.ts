import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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
import { generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create";
import { prepare_random_ecommerce_cache_configuration_parameter_definition } from "../../../prepare/prepare_random_ecommerce_cache_configuration_parameter_definition";

export async function test_api_cache_parameter_definition_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create a cache parameter definition
  const parameterDefinition =
    await generate_random_ecommerce_super_administrator_cache_configurations_parameter_definitions_create(
      superAdminConnection,
      {
        body: {
          parameter_name: RandomGenerator.alphabets(10),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_required: true,
        } satisfies IEcommerceCacheConfigurationParameterDefinition.ICreate,
      },
    );
  typia.assert(parameterDefinition);
  // Delete the parameter definition
  await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.erase(
    superAdminConnection,
    {
      definitionId: parameterDefinition.id,
    },
  );
  // Attempt to delete the same parameter definition again
  await TestValidator.error(
    "delete already soft-deleted parameter definition should error",
    async () => {
      await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.erase(
        superAdminConnection,
        {
          definitionId: parameterDefinition.id,
        },
      );
    },
  );
}
