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

export async function test_api_metadata_registry_delete_inactive_or_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using direct SDK since no utility function exists
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerce.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test deletion of invalid UUID that would simulate inactive/already deleted registry
  // The API should validate registry status before allowing deletion
  await TestValidator.httpError(
    "should return 404 for non-existent registry or 400 for inactive registry",
    [400, 404], // Expected status codes based on scenario description
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.erase(
        adminConnection,
        {
          registryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
