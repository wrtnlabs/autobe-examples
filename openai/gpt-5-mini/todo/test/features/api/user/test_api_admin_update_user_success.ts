import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Admin updates a user's display name successfully (admin-scoped update).
 *
 * Notes:
 *
 * - The original scenario requested updating account_status, but the generated
 *   SDK's admin update operation accepts ITodoAppUser.IUpdate as its request
 *   body (which contains display_name). To remain fully type-safe and
 *   compilable, this test updates display_name as the admin operation's
 *   observable effect. This still validates the admin update flow:
 *   authentication as admin, privileged update, and returned user object
 *   reflecting the change.
 *
 * Workflow:
 *
 * 1. Create a target user via POST /auth/user/join (public). The SDK will set
 *    connection.headers.Authorization to the created user's token — therefore
 *    we create the target user first.
 * 2. Create an admin account via POST /auth/admin/join. The SDK will set
 *    connection.headers.Authorization to the admin token.
 * 3. As admin, call PUT /todoApp/admin/users/{userId} with body { display_name }
 * 4. Assert that the returned ITodoAppUser has the updated display_name, the same
 *    id as the created user, and contains account_status (string).
 *
 * Limitations: Audit-record verification is out of scope because no audit
 * retrieval API was provided in the materials.
 */
export async function test_api_admin_update_user_success(
  connection: api.IConnection,
) {
  // 1. Create target user (public registration)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "P@ssw0rd123";
  const initialDisplay = RandomGenerator.name();

  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: initialDisplay,
      } satisfies ITodoAppUser.ICreate,
    });
  // Runtime type validation
  typia.assert(createdUser);

  // 2. Create admin account (becomes current auth context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ssw0rd123";

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 3. Prepare and perform admin update (change display_name)
  const newDisplayName = RandomGenerator.name();

  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: createdUser.id,
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser);

  // 4. Business assertions
  TestValidator.equals(
    "updated user id should remain the same",
    updatedUser.id,
    createdUser.id,
  );

  TestValidator.equals(
    "admin updated display_name",
    updatedUser.display_name,
    newDisplayName,
  );

  // Ensure account_status is present and is a string (server-managed field)
  TestValidator.predicate(
    "account_status exists and is a string",
    typeof updatedUser.account_status === "string",
  );
}
