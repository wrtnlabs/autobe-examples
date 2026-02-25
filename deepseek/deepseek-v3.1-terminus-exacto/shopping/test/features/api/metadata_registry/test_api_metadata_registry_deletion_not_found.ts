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

/**
 * Test metadata registry deletion error handling when registry does not exist.
 * 1. Authenticate as super administrator
 * 2. Attempt to delete with valid but non-existent UUID
 * 3. Validate 404 Not Found error response
 */
export async function test_api_metadata_registry_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerce.auth.superAdministrator.join(
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
  // 2. Generate valid but non-existent UUID
  const nonExistentRegistryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent registry and validate 404 error
  await TestValidator.httpError(
    "delete non-existent metadata registry returns 404",
    404,
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.erase(
        superAdminConnection,
        {
          registryId: nonExistentRegistryId satisfies string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
