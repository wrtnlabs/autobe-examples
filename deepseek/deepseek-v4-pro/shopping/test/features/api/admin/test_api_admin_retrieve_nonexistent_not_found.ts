import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that retrieving a non-existent administrator ID returns a 404 Not Found response.
 *
 * Validates the boundary condition where a requested administrator resource does not exist in the system. Soft-deleted administrator accounts are treated as non-existent and must return 404 from all consuming endpoints.
 *
 * 1. Registers a new administrator account via join to obtain an authenticated session.
 * 2. Generates a random UUID that does not correspond to any existing administrator.
 * 3. Calls the administrator retrieval endpoint with the non-existent UUID.
 * 4. Confirms the response is a 404 Not Found error.
 */
export async function test_api_admin_retrieve_nonexistent_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin to obtain authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2 & 3. Attempt to retrieve a non-existent admin, expect 404
  await TestValidator.httpError(
    "non-existent admin returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admins.at(adminConnection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
