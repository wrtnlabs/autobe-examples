import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_admin_user_retrieve_forbidden_non_admin(
  connection: api.IConnection,
) {
  // 1) Create the target user (the one we will try to retrieve via admin endpoint)
  const targetUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(targetUser);

  // 2) Create the caller user (a normal non-admin account). After this call,
  //    connection will be authenticated as this non-admin user (SDK automatically
  //    sets connection.headers.Authorization to returned token.access).
  const callerUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(callerUser);

  // 3) Attempt to call the admin-only endpoint using the non-admin caller.
  //    Expect an HTTP 403 Forbidden error.
  await TestValidator.httpError(
    "non-admin cannot retrieve admin user",
    403,
    async () => {
      await api.functional.todoApp.admin.users.at(connection, {
        userId: targetUser.id,
      });
    },
  );
}
