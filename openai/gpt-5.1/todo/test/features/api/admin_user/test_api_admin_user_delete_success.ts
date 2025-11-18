import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that an authenticated admin user can successfully delete another
 * admin account by UUID using the todo_app_adminusers erase endpoint.
 *
 * Business goals:
 *
 * - Ensure that an admin created through the join flow can call the DELETE
 *   /todoApp/adminUser/adminUsers/{adminUserId} endpoint.
 * - Confirm that it is possible to delete a _different_ admin account (not the
 *   currently authenticated one) using that endpoint.
 * - Exercise the happy path of the erase operation, verifying that it completes
 *   without error when called with a valid adminUserId and proper
 *   authentication.
 *
 * Scenario steps:
 *
 * 1. Create the target admin via POST /auth/adminUser/join. This inserts a row
 *    into todo_app_adminusers and configures the connection with that adminUser
 *    token (Authorization header) via the SDK.
 * 2. Create a second admin (the acting admin) using another join call. After this
 *    call, the connection’s Authorization header corresponds to the acting
 *    admin, while we still retain the target admin’s id from step 1.
 * 3. Assert that the two admin IDs differ to guarantee we are not about to delete
 *    the logged-in admin account.
 * 4. Invoke api.functional.todoApp.adminUser.adminUsers.erase with adminUserId set
 *    to the target admin’s id. Because erase returns void, success is defined
 *    as the call completing without throwing an HttpError.
 * 5. Since the provided SDK subset does not include GET or listing endpoints for
 *    admin users, skip post-deletion read/list validation. The test focuses on
 *    correct authentication, proper parameter wiring, and absence of errors
 *    from the erase call.
 */
export async function test_api_admin_user_delete_success(
  connection: api.IConnection,
) {
  // 1. Create the target admin via join
  const targetAdmin = await api.functional.auth.adminUser.join(connection, {
    body: typia.random<ITodoAppAdminUser.IJoin>(),
  });
  typia.assert(targetAdmin);

  // 2. Create the acting admin via a second join (this updates Authorization)
  const actingAdmin = await api.functional.auth.adminUser.join(connection, {
    body: typia.random<ITodoAppAdminUser.IJoin>(),
  });
  typia.assert(actingAdmin);

  // 3. Ensure we are deleting a different admin than the acting one
  TestValidator.notEquals(
    "acting admin and target admin must have different ids",
    actingAdmin.id,
    targetAdmin.id,
  );

  // 4. Call erase to delete the target admin by UUID while authenticated
  //    as the acting admin
  await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
    adminUserId: targetAdmin.id,
  });

  // 5. No further assertions are possible without read/list APIs for
  //    admin users; successful completion of erase without thrown error
  //    is treated as a successful deletion.
}
