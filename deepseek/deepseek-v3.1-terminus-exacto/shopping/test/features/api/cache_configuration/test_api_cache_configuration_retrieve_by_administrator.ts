import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
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
 * Test that an authenticated administrator can retrieve cache configuration details.
 */
export async function test_api_cache_configuration_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        typia.random<string & tags.Format<"password">>() ||
        RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // 2. Generate a valid cache configuration ID
  const configId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve cache configuration using authenticated administrator connection
  const config =
    await api.functional.ecommerce.administrator.cache_configurations.at(
      adminConnection,
      {
        configId,
      },
    );
  typia.assert(config);
  // 4. Verify the configuration ID matches the requested ID
  TestValidator.equals(
    "retrieved config ID should match requested ID",
    config.id,
    configId,
  );
}
