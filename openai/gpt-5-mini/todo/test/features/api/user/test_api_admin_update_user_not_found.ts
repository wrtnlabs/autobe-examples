import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_admin_update_user_not_found(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure admin update endpoint gracefully handles attempts to update a user
   *   that does not exist.
   *
   * Workflow:
   *
   * 1. Create (join) an admin account to obtain authorization.
   * 2. Generate a valid UUID that (very likely) does not map to any user.
   * 3. Attempt to PUT an update for that UUID and assert that the call fails
   *    (throws an error).
   */

  // 1) Create an admin account (SDK will set Authorization header on success)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    is_super: false,
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // 2) Generate a random UUID that should not exist in the system
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // 3) Prepare a valid update body for admin update (only allowed fields)
  const updateBody = {
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.IUpdate;

  // 4) Attempt the update and assert an error is thrown (server should reject)
  await TestValidator.error(
    "admin update non-existent user should fail",
    async () => {
      await api.functional.todoApp.admin.users.update(connection, {
        userId: nonExistentUserId,
        body: updateBody,
      });
    },
  );
}
