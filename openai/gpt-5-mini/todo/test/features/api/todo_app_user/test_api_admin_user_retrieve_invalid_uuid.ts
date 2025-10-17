import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_admin_user_retrieve_invalid_uuid(
  connection: api.IConnection,
) {
  // Purpose: Ensure admin-only user retrieval endpoint validates UUID path parameter
  // 1) Create (join) an admin to obtain authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "P@ssw0rd",
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2) Attempt to retrieve a user with a malformed UUID and expect HTTP 400
  await TestValidator.httpError(
    "admin user retrieval with malformed UUID should return 400",
    400,
    async () => {
      await api.functional.todoApp.admin.users.at(connection, {
        userId: "invalid-uuid",
      });
    },
  );
}
