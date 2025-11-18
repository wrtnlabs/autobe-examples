import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that an active admin can view detailed profile information for
 * another admin user even after that target admin account has been suspended.
 *
 * Business context:
 *
 * - Admin A is a controlling administrator who manages other admin accounts.
 * - Admin B is a secondary admin whose status can be changed (e.g. suspended).
 * - Even when Admin B is suspended and cannot log in, Admin A must still be able
 *   to retrieve Admin B’s profile for audit and management.
 *
 * Test flow:
 *
 * 1. Register Admin A via /auth/adminUser/join (ITodoAppAdminUser.IJoin) and rely
 *    on SDK to store the Authorization header.
 * 2. While authenticated as Admin A, create at least one system setting via
 *    /todoApp/adminUser/systemSettings (ITodoAppSystemSetting.ICreate) to
 *    simulate a configured environment.
 * 3. Register Admin B (also via /auth/adminUser/join) capturing its id/email from
 *    ITodoAppAdminUser.IAuthorized.
 * 4. Still under an adminUser-authenticated connection (the SDK overwrites
 *    Authorization on each join), update Admin B via PUT
 *    /todoApp/adminUser/adminUsers/{adminUserId} (ITodoAppAdminUser.IUpdate) to
 *    set status to "suspended" while optionally updating display_name.
 * 5. Call GET /todoApp/adminUser/adminUsers/{adminUserId} for Admin B.
 * 6. Assert that the response is a valid ITodoAppAdminUser object (typia.assert)
 *    and that:
 *
 *    - Id matches Admin B’s id from the join step,
 *    - Email matches Admin B’s email from the join step,
 *    - Status === "suspended".
 * 7. The DTO type guarantees that password_hash is not present in the serialized
 *    response, satisfying the requirement that sensitive fields are never
 *    exposed while still allowing suspended accounts to be visible.
 */
export async function test_api_admin_user_detail_for_suspended_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A (controlling administrator)
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Create a baseline system setting as Admin A
  const settingBody = {
    key: `max_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);

  // 3. Register Admin B (target to be suspended)
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // Capture Admin B identity for later comparison
  const adminBId = adminB.id;
  const adminBEmail = adminB.email;
  const adminBInitialStatus = adminB.status;

  // 4. Suspend Admin B via update endpoint
  const updateBody = {
    status: "suspended",
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppAdminUser.IUpdate;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminBId,
      body: updateBody,
    });
  typia.assert(updatedAdminB);

  // Validate status change on the update response itself
  TestValidator.equals(
    "updatedAdminB.id should match original Admin B id",
    updatedAdminB.id,
    adminBId,
  );
  TestValidator.equals(
    "updatedAdminB.email should remain equal to original Admin B email",
    updatedAdminB.email,
    adminBEmail,
  );
  TestValidator.equals(
    "updatedAdminB.status should be 'suspended' after update",
    updatedAdminB.status,
    "suspended",
  );
  TestValidator.notEquals(
    "updatedAdminB.status should differ from initial join status",
    updatedAdminB.status,
    adminBInitialStatus,
  );

  // 5. Fetch Admin B details via GET /todoApp/adminUser/adminUsers/{adminUserId}
  const fetchedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: adminBId,
    });
  typia.assert(fetchedAdminB);

  // 6. Assert identity and suspended status on the GET response
  TestValidator.equals(
    "fetchedAdminB.id should match Admin B id",
    fetchedAdminB.id,
    adminBId,
  );
  TestValidator.equals(
    "fetchedAdminB.email should match Admin B email",
    fetchedAdminB.email,
    adminBEmail,
  );
  TestValidator.equals(
    "fetchedAdminB.status should reflect 'suspended' state",
    fetchedAdminB.status,
    "suspended",
  );

  // Implicitly, by type design, password_hash is not present in ITodoAppAdminUser
  // and therefore is not exposed by either update or at endpoints.
}
