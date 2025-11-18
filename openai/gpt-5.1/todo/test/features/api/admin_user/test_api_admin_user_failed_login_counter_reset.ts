import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that an authenticated admin user can reset and adjust
 * failed_login_count on an admin account using the adminUsers.update API.
 *
 * Business flow:
 *
 * 1. Register a new admin user via POST /auth/adminUser/join. The response
 *    ITodoAppAdminUser.IAuthorized includes the admin's id and current
 *    failed_login_count plus created_at/updated_at. The SDK also stores the
 *    access token into connection.headers automatically.
 * 2. Use that same admin as the operator and call PUT
 *    /todoApp/adminUser/adminUsers/{adminUserId} with ITodoAppAdminUser.IUpdate
 *    to change failed_login_count to a positive integer (e.g. 5). Verify the
 *    returned ITodoAppAdminUser has failed_login_count === 5 and that
 *    updated_at has moved forward.
 * 3. Call the update endpoint again to reset failed_login_count back to 0,
 *    confirming that the counter can be cleared after security review and that
 *    updated_at changes again.
 * 4. Throughout, verify that invariant/system-controlled fields such as id,
 *    created_at, and email remain stable, and that deleted_at stays null in
 *    this happy-path scenario.
 */
export async function test_api_admin_user_failed_login_counter_reset(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (acts as both subject and operator)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // Basic invariants from join response
  TestValidator.predicate(
    "initial failed_login_count is zero or non-negative",
    authorized.failed_login_count >= 0,
  );
  TestValidator.predicate(
    "created_at and updated_at are defined on authorized payload",
    !!authorized.created_at && !!authorized.updated_at,
  );

  const adminId = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  const originalDeletedAt = authorized.deleted_at ?? null;

  // 2. First update: set failed_login_count to a positive integer
  const firstTargetCount = 5;

  const firstUpdateBody = {
    failed_login_count: firstTargetCount,
  } satisfies ITodoAppAdminUser.IUpdate;

  const afterFirstUpdate: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminId,
      body: firstUpdateBody,
    });
  typia.assert<ITodoAppAdminUser>(afterFirstUpdate);

  TestValidator.equals(
    "failed_login_count should be updated to positive integer (5)",
    firstTargetCount,
    afterFirstUpdate.failed_login_count,
  );
  TestValidator.equals(
    "id must remain unchanged after first update",
    afterFirstUpdate.id,
    adminId,
  );
  TestValidator.equals(
    "email must remain unchanged after first update",
    afterFirstUpdate.email,
    originalEmail,
  );
  TestValidator.equals(
    "created_at must remain unchanged after first update",
    afterFirstUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged (null baseline) after first update",
    afterFirstUpdate.deleted_at ?? null,
    originalDeletedAt,
  );

  TestValidator.predicate(
    "updated_at should be same or later than original after first update",
    afterFirstUpdate.updated_at >= originalUpdatedAt,
  );

  const firstUpdatedAt = afterFirstUpdate.updated_at;

  // 3. Second update: reset failed_login_count back to 0
  const secondTargetCount = 0;

  const secondUpdateBody = {
    failed_login_count: secondTargetCount,
  } satisfies ITodoAppAdminUser.IUpdate;

  const afterSecondUpdate: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminId,
      body: secondUpdateBody,
    });
  typia.assert<ITodoAppAdminUser>(afterSecondUpdate);

  TestValidator.equals(
    "failed_login_count should be reset to zero",
    secondTargetCount,
    afterSecondUpdate.failed_login_count,
  );
  TestValidator.equals(
    "id remains stable after second update",
    afterSecondUpdate.id,
    adminId,
  );
  TestValidator.equals(
    "email remains stable after second update",
    afterSecondUpdate.email,
    originalEmail,
  );
  TestValidator.equals(
    "created_at remains stable after second update",
    afterSecondUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged (null baseline) after second update",
    afterSecondUpdate.deleted_at ?? null,
    originalDeletedAt,
  );

  TestValidator.predicate(
    "updated_at should be same or later than afterFirstUpdate",
    afterSecondUpdate.updated_at >= firstUpdatedAt,
  );
}
