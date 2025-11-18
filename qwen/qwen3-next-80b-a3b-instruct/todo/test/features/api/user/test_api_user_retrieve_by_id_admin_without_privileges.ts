import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_admin_without_privileges(
  connection: api.IConnection,
) {
  // Create a regular user account
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies ITodoListUser.ICreate;

  const userResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCredentials,
    });
  typia.assert(userResponse);

  // Attempt to retrieve the user account using the regular user's connection (non-admin privileges)
  // The /todoList/user/actors/{userId} endpoint is restricted to admin actors only
  // Per the API documentation, this should fail with 403 Forbidden for non-admin users
  await TestValidator.error(
    "regular user cannot retrieve user account via admin-restricted endpoint",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: userResponse.id,
      });
    },
  );
}
