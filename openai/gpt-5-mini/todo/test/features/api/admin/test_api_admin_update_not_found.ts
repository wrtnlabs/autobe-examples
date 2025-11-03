import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminRole";

export async function test_api_admin_update_not_found(
  connection: api.IConnection,
) {
  // 1) Create an admin account (self-signup) to obtain authentication token
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    href: "https://example.local/signup",
    referrer: "https://example.local/",
  } satisfies ITodoAppAdmin.ICreate;

  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  // Validate the authorized response
  typia.assert(authorized);

  // 2) Prepare a valid but (very likely) non-existent UUID for adminId
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();

  // 3) Prepare a valid update payload
  const updateBody = {
    displayName: RandomGenerator.name(),
    role: "moderator",
    isActive: true,
  } satisfies ITodoAppAdmin.IUpdate;

  // 4) Attempt to update the non-existent admin and expect 404 Not Found
  await TestValidator.httpError(
    "updating non-existent admin should return 404",
    404,
    async () => {
      await api.functional.todoApp.admin.admins.update(connection, {
        adminId: nonExistentAdminId,
        body: updateBody,
      });
    },
  );
}
