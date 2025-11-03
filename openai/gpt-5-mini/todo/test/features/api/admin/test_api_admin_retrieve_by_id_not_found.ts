import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminRole";

export async function test_api_admin_retrieve_by_id_not_found(
  connection: api.IConnection,
) {
  /**
   * Scenario: Attempt to retrieve an administrator by a valid but non-existent
   * UUID while authenticated as an admin. The test ensures the retrieval fails
   * (resource not found) while running in an authenticated context.
   *
   * Steps:
   *
   * 1. Register a new admin via POST /auth/admin/join to obtain authorization
   *    token and establish authenticated context.
   * 2. Generate a random syntactically valid UUID that is not expected to exist in
   *    the system.
   * 3. Call GET /todoApp/admin/admins/{adminId} with the random UUID and assert
   *    that the call throws (resource is not found). Use TestValidator.error to
   *    assert an error is thrown for the async operation.
   */

  // 1) Create a new admin account to obtain authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const created: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdmin.ICreate,
    });
  // Ensure we have a valid authorized payload (token attached to connection by SDK)
  typia.assert(created);

  // 2) Generate a random UUID that should not exist in the system
  const nonExistentAdminId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Attempt to retrieve the non-existent admin and assert that the call fails
  await TestValidator.error(
    "retrieving non-existent admin should fail",
    async () => {
      await api.functional.todoApp.admin.admins.at(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
