import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that updating an admin user's email to an email already used by
 * another admin user fails due to the unique email constraint on
 * todo_app_adminusers.
 *
 * Business context:
 *
 * - ITodoAppAdminUser.email is defined as a unique login identifier for admin
 *   accounts, enforced by a unique index in the todo_app_adminusers table.
 * - The PUT /todoApp/adminUser/adminUsers/{adminUserId} endpoint must respect
 *   this uniqueness and reject updates that would cause duplicate emails.
 *
 * Test workflow:
 *
 * 1. Create first admin user A via POST /auth/adminUser/join with a random email.
 * 2. Create second admin user B via POST /auth/adminUser/join with a different
 *    random email.
 * 3. Attempt to update admin B's email to admin A's email via PUT
 *    /todoApp/adminUser/adminUsers/{adminUserId}.
 * 4. Confirm that the update operation fails (throws) due to the email uniqueness
 *    constraint, using TestValidator.error.
 * 5. Ensure both join responses are valid ITodoAppAdminUser.IAuthorized objects
 *    using typia.assert for strong type safety.
 *
 * Note:
 *
 * - We do not validate specific HTTP status codes or error payload contents to
 *   avoid coupling to transport-level details; we only ensure that an error is
 *   raised when attempting a conflicting update.
 */
export async function test_api_admin_user_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Create admin A with a random unique email
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoinBody = {
    email: adminAEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Create admin B with a different random unique email
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoinBody = {
    email: adminBEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminB);

  // Sanity check: ensure emails are indeed different before attempting conflict
  TestValidator.notEquals(
    "admin A and admin B must have different emails before conflict test",
    adminA.email,
    adminB.email,
  );

  // 3. Attempt to update admin B's email to admin A's email, which should
  //    violate the unique index on email in todo_app_adminusers and result in
  //    an error.
  await TestValidator.error(
    "updating admin B's email to admin A's email must fail due to uniqueness constraint",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.update(connection, {
        adminUserId: adminB.id,
        body: {
          email: adminA.email,
        } satisfies ITodoAppAdminUser.IUpdate,
      });
    },
  );
}
