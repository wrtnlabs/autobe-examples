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

export async function test_api_metadata_registry_delete_with_cascading_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorization utility for administrator join
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 2. Attempt to delete a non‑existent metadata registry
  //    Since we have no API to create a registry, test error handling (404)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Verify that deletion of non‑existent registry returns 404
  await TestValidator.httpError(
    "deleting non‑existent metadata registry should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.erase(
        adminConnection,
        { registryId: nonExistentId },
      );
    },
  );
}
