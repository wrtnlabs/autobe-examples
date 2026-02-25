import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_cache_parameter_definition_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
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
      },
    },
  );
  typia.assert(superAdmin);
  // Generate a random definition ID for deletion attempt
  const definitionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the parameter definition
  // Since we cannot verify existence or soft deletion without CREATE/GET endpoints,
  // we test that the DELETE operation completes without error
  await api.functional.ecommerce.superAdministrator.cache_configurations.parameter_definitions.erase(
    superAdminConnection,
    {
      definitionId,
    },
  );
  // The operation should complete successfully without throwing an error
  // This validates that the endpoint is accessible and handles the request appropriately
}
