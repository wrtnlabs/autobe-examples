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

export async function test_api_cache_configuration_parameter_definition_soft_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // This test cannot be fully implemented with the available API functions.
  // The scenario requires creating a parameter definition first, but the
  // provided API functions only include the DELETE endpoint, not a CREATE endpoint.
  // Therefore, we can only test the deletion of a non-existent definition.
  const adminConnection: api.IConnection = { host: connection.host };
  // Create administrator authentication - using available utility function
  const adminAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Update connection with auth token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // Generate a random UUID for a non-existent parameter definition
  const definitionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the already deleted (non-existent) parameter definition
  await TestValidator.httpError(
    "delete already deleted parameter definition should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.erase(
        adminConnection,
        { definitionId },
      );
    },
  );
}
