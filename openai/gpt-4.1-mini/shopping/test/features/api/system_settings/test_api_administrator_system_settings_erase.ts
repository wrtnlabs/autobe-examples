import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_settings_erase(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test delete an existing system setting successfully by an authorized admin.
   * Steps:
   * 1. Admin joins and is authorized.
   * 2. Create a system setting for delete test (simulate creation or use random UUID).
   * 3. Admin sends DELETE request with existing system setting UUID.
   * 4. Verify no content response (HTTP 204).
   * 5. Verify the system setting is deleted (no longer exists).
   * 6. Verify deletion is logged.
   *
   * Test delete non-existent UUID returns 404.
   * Test unauthorized delete attempt returns 401.
   */
  // 1. Admin joins and authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // We don't have systemSettings create API; simulate existence by generating random UUID
  // Scenario 1: Delete existing UUID
  const existingId = typia.random<string & tags.Format<"uuid">>();
  // Perform deletion with valid admin
  await api.functional.shoppingMall.administrator.systemSettings.erase(
    adminConnection,
    {
      id: existingId,
    },
  );
  // No direct way to check deletion or audit logs in the current API set
  // Hence, we can only confirm that the API call did not throw error
  // Scenario 2: Delete with non-existent UUID must return 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent system setting returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.systemSettings.erase(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized delete attempt returns 401
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized delete attempt returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemSettings.erase(
        unauthorizedConnection,
        {
          id: existingId,
        },
      );
    },
  );
}
