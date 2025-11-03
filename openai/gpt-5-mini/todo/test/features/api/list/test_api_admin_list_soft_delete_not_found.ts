import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_list_soft_delete_not_found(
  connection: api.IConnection,
) {
  /**
   * Admin attempts to soft-delete a non-existent list.
   *
   * Steps:
   *
   * 1. Register a new admin via POST /auth/admin/join to obtain authorization.
   * 2. Attempt to DELETE /todoApp/admin/lists/{listId} using a well-formed random
   *    UUID that does not exist.
   *
   * Validation:
   *
   * - Api.functional.auth.admin.join returns ITodoAppAdmin.IAuthorized (asserted)
   * - DELETE call results in an HTTP error with status 404 (checked via
   *   TestValidator.httpError)
   */

  // 1) Admin sign-up (obtain authorization handled by SDK)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: "http://example.com/",
    referrer: "http://example.com/",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminBody },
  );
  // Runtime type validation for the authorized admin response
  typia.assert(admin);

  // 2) Attempt to delete a non-existent list id
  const nonExistentListId = typia.random<string & tags.Format<"uuid">>();

  // Expect a 404 Not Found when deleting a non-existent list.
  await TestValidator.httpError(
    "deleting non-existent list should return 404",
    404,
    async () => {
      await api.functional.todoApp.admin.lists.erase(connection, {
        listId: nonExistentListId,
      });
    },
  );
}
