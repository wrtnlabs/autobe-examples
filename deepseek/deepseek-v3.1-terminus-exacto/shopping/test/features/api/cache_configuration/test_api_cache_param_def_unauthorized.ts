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

/**
 * Test authorization enforcement for cache parameter definition retrieval.
 * Attempt to access the endpoint without administrator authentication.
 * Verify the API properly rejects unauthorized access with appropriate 401 status code.
 */
export async function test_api_cache_param_def_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the definitionId parameter
  const definitionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to access the endpoint using the base connection (no admin authentication)
  // This should fail since the endpoint requires administrator authorization
  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.at(
        connection,
        { definitionId },
      );
    },
  );
}
