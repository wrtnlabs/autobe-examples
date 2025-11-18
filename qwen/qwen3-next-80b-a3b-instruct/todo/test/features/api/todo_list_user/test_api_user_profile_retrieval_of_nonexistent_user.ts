import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_profile_retrieval_of_nonexistent_user(
  connection: api.IConnection,
) {
  // Create a legitimate user first to establish system state
  const createdUser: ITodoListUser =
    await api.functional.todoList.todo_list_users.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Generate a random UUID that has an astronomically low probability of collision
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // Verify that attempting to retrieve the non-existent user returns a 404 error
  await TestValidator.error(
    "should return 404 for non-existent user",
    async () => {
      await api.functional.todoList.user.todo_list_users.at(connection, {
        userId: nonExistentId,
      });
    },
  );
}
