import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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
 * Test authorization enforcement by attempting to delete a cache configuration
 * parameter definition without proper administrator credentials.
 * 1. Generate a random definition ID (valid UUID)
 * 2. Attempt DELETE without authentication
 * 3. Verify 401 Unauthorized response
 */
export async function test_api_cache_configuration_parameter_definition_delete_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a random definition ID
  const definitionId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Attempt DELETE without authentication
  // We use the base connection which has no Authorization header
  await TestValidator.httpError(
    "should return 401 Unauthorized without admin authentication",
    401,
    async () =>
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.erase(
        connection,
        { definitionId },
      ),
  );
}
