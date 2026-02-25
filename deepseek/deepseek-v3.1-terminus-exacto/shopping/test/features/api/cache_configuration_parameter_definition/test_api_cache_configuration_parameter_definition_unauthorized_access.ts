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

export async function test_api_cache_configuration_parameter_definition_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection without authentication headers
  const connectionWithoutAuth: api.IConnection = { host: connection.host };
  // No authentication setup - we deliberately skip calling any authorize functions
  // Generate a valid UUID for testing
  const definitionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access the endpoint without authentication
  await TestValidator.error(
    "should reject unauthorized access to cache configuration parameter definition",
    async () => {
      await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.at(
        connectionWithoutAuth,
        { definitionId },
      );
    },
  );
}
