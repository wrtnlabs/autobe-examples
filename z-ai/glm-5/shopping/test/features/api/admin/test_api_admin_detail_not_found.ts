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
 * Test scenario for handling retrieval of a non-existent administrator account.
 *
 * This test validates the error handling when attempting to retrieve an
 * administrator that does not exist in the system. The test ensures that:
 *
 * 1. The system properly validates adminId existence before returning data
 * 2. An appropriate 404 error is returned for non-existent administrators
 * 3. Security is maintained by not leaking information about existing IDs
 *
 * Steps:
 * 1. Register a new administrator account via join endpoint
 * 2. Generate a UUID that does not exist in the database
 * 3. Call GET /shoppingMall/admin/admins/{adminId} with non-existent adminId
 * 4. Validate the response returns 404 Not Found error
 */
export async function test_api_admin_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account to get authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Use a non-existent UUID (valid UUID format but not in database)
  const nonExistentAdminId = "00000000-0000-0000-0000-000000000000";
  // 3. Call the endpoint with non-existent adminId and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent administrator",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
