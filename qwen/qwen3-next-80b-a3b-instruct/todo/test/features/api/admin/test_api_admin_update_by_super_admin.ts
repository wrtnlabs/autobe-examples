import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_update_by_super_admin(
  connection: api.IConnection,
) {
  const superAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashedPassword123",
        role: "super_admin",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(superAdmin);

  const targetAdmin: ITodoAppAdmin =
    await api.functional.todoApp.admin.admins.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashedPassword456",
        role: "admin",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  const updatedAdmin: ITodoAppAdmin =
    await api.functional.todoApp.admin.admins.update(connection, {
      adminId: targetAdmin.id,
      body: "updated information",
    });
  typia.assert(updatedAdmin);

  TestValidator.equals(
    "admin account updated successfully",
    updatedAdmin.email,
    targetAdmin.email,
  );
}
