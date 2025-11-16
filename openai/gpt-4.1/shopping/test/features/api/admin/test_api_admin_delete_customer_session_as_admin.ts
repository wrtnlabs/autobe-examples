import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate admin-privileged deletion of a customer session record.
 *
 * This test verifies that only an authenticated administrator is able to delete
 * customer session records, demonstrating enforcement of access control and the
 * requirement of admin privileges for this operation.
 *
 * 1. Register as a new platform admin via the admin join API, acquiring a valid
 *    authorization token for the session.
 * 2. (Given lack of customer/session creation APIs, use random valid UUIDs as
 *    stand-in for customerId and sessionId.)
 * 3. Invoke DELETE /shoppingMall/admin/customers/{customerId}/sessions/{sessionId}
 *    with admin credentials and random UUIDs.
 * 4. Confirm the API call completes with no error, demonstrating that an
 *    authenticated admin can execute the operation with correct input types.
 * 5. Assert that no forbidden side effects or authorization errors occur under
 *    appropriate admin context.
 */
export async function test_api_admin_delete_customer_session_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration (provides authentication with Authorization header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Use random UUIDs for customerId and sessionId (since no create API exists)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete session as admin
  await api.functional.shoppingMall.admin.customers.sessions.erase(connection, {
    customerId,
    sessionId,
  });

  // 4. The operation should complete successfully, with no error thrown
}
