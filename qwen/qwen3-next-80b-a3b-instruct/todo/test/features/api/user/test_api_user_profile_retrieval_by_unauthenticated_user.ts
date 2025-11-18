import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_profile_retrieval_by_unauthenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a target user account via registration
  const newUser: ITodoListUser =
    await api.functional.todoList.todo_list_users.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);

  // Step 2: Attempt to retrieve the user profile without authentication (unauthenticated request)
  // This should fail with a 401 Unauthorized error as per the scenario requirement
  await TestValidator.error(
    "unauthenticated user should not be able to retrieve profile",
    async () => {
      await api.functional.todoList.user.todo_list_users.at(connection, {
        userId: newUser.id,
      });
    },
  );
}
