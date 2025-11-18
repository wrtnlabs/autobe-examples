import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that requesting details for a non-existent admin user id results in
 * an error instead of a successful ITodoAppAdminUser payload.
 *
 * Business focus:
 *
 * - The detail endpoint must not return an arbitrary or unrelated admin record
 *   when the id does not exist.
 * - The system should surface a clear not-found style error through HttpError,
 *   without succeeding with ITodoAppAdminUser.
 * - Error scenario must be exercised under a properly authenticated adminUser
 *   context established via join.
 */
export async function test_api_admin_user_detail_not_found_behavior(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain an authenticated admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Build a UUID that is guaranteed to be different from the
  //    existing admin user id. Loop until we get a distinct value.
  const existingId = authorized.id;
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (nonexistentId === existingId) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 3. Call the detail endpoint with the non-existent id and assert
  //    that an HttpError is thrown instead of returning an entity.
  await TestValidator.error(
    "admin user detail with non-existent id must error",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.at(connection, {
        adminUserId: nonexistentId,
      });
    },
  );
}
