import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Cross-admin profile update access control for todoAdmin accounts.
 *
 * This test verifies that the administrative profile update endpoint `PUT
 * /todoApp/todoAdmin/todoAdmins/{todoAdminId}` correctly updates the targeted
 * admin account while preserving non-updated fields, and that the result is
 * consistent when updating another admin versus updating the currently
 * authenticated admin.
 *
 * Business-flow covered in this test:
 *
 * 1. Register the first admin (adminA) using POST /auth/todoAdmin/join.
 * 2. Bootstrap a Todo status row using POST /todoApp/todoAdmin/todoStatuses,
 *    mirroring the real-world prerequisite that status catalogue exists.
 * 3. Register the second admin (adminB) using POST /auth/todoAdmin/join. This also
 *    sets the connection's Authorization header for adminB.
 * 4. While authenticated as adminB, perform a cross-admin update targeting adminA
 *    via PUT /todoApp/todoAdmin/todoAdmins/{todoAdminId} and change adminA's
 *    display_name and status.
 * 5. Assert that the response represents adminA with updated display_name and
 *    status, unchanged email, and a different updated_at timestamp.
 * 6. Still authenticated as adminB, perform a self-update on adminB's own record,
 *    changing only the display_name, and verify that email and status remain
 *    unchanged while display_name and updated_at are updated.
 */
export async function test_api_todoadmin_profile_update_cross_admin_access_control(
  connection: api.IConnection,
) {
  // 1. Register the first admin (adminA).
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-123",
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAAuth: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  const adminAId = adminAAuth.id;

  // 2. Bootstrap a Todo status row for catalogue readiness.
  const sortOrder = typia.random<number & tags.Type<"int32">>();

  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: null,
    sort_order: sortOrder,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Register the second admin (adminB). Connection will now represent adminB.
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-123",
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminBAuth: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  const adminBId = adminBAuth.id;

  // 4. Cross-admin update: currently authenticated admin (adminB) updates adminA's profile.
  const newAdminADisplayName = RandomGenerator.name(2);
  const newAdminAStatus = "suspended";

  const crossUpdateBody = {
    display_name: newAdminADisplayName,
    status: newAdminAStatus,
  } satisfies ITodoAppTodoAdmin.IUpdate;

  const updatedAdminA: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
      todoAdminId: adminAId,
      body: crossUpdateBody,
    });
  typia.assert(updatedAdminA);

  // 5. Assertions for cross-admin update effects.
  TestValidator.equals(
    "cross-admin update targets adminA record",
    updatedAdminA.id,
    adminAId,
  );
  TestValidator.equals(
    "cross-admin update keeps adminA email unchanged",
    updatedAdminA.email,
    adminAAuth.email,
  );
  TestValidator.equals(
    "cross-admin update changes adminA display_name",
    updatedAdminA.display_name,
    newAdminADisplayName,
  );
  TestValidator.equals(
    "cross-admin update changes adminA status",
    updatedAdminA.status,
    newAdminAStatus,
  );
  TestValidator.notEquals(
    "adminA updated_at must change after cross-admin update",
    updatedAdminA.updated_at,
    adminAAuth.updated_at,
  );

  // 6. Self-update sanity check for adminB.
  const newAdminBDisplayName = RandomGenerator.name(2);

  const selfUpdateBody = {
    display_name: newAdminBDisplayName,
  } satisfies ITodoAppTodoAdmin.IUpdate;

  const updatedAdminB: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
      todoAdminId: adminBId,
      body: selfUpdateBody,
    });
  typia.assert(updatedAdminB);

  TestValidator.equals(
    "self update targets adminB record",
    updatedAdminB.id,
    adminBId,
  );
  TestValidator.equals(
    "self update keeps adminB email unchanged",
    updatedAdminB.email,
    adminBAuth.email,
  );
  TestValidator.equals(
    "self update changes adminB display_name",
    updatedAdminB.display_name,
    newAdminBDisplayName,
  );
  TestValidator.equals(
    "self update keeps adminB status unchanged",
    updatedAdminB.status,
    adminBAuth.status,
  );
}
