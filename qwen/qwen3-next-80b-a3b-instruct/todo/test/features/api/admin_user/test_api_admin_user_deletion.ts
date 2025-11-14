import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_user_deletion(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish proper authorization context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = "hashedpassword123"; // Bcrypt hashed password
  const adminRole: string = "admin";

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        role: adminRole,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Create a new admin account to have a valid administrator
  const newAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const newAdminPasswordHash: string = "hashedpassword456"; // Bcrypt hashed password
  const newAdminRole: string = "admin";

  const newAdmin: ITodoAppAdmin =
    await api.functional.todoApp.admin.admins.create(connection, {
      body: {
        email: newAdminEmail,
        password_hash: newAdminPasswordHash,
        role: newAdminRole,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(newAdmin);

  // Step 3: Delete the newly created admin account
  await api.functional.todoApp.admin.users.erase(connection, {
    userId: newAdmin.id,
  });
}
