import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_creation_title_too_long(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user to establish session context
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Attempt to create a todo item with title exceeding 200 characters (201 characters)
  const longTitle = RandomGenerator.alphabets(201); // 201 characters - exceeds maxLength: 200

  // Step 3: Validate that the API rejects the request with 400 Bad Request error
  await TestValidator.error(
    "Creating todo item with title exceeding 200 characters should fail",
    async () => {
      await api.functional.todoList.user.todoItems.create(connection, {
        body: longTitle, // ITodoListTodo.ICreate is string, not object
      });
    },
  );

  // Step 4: Verify that no todo item was created in the system
  // This validation is implicit: if the create call failed with error,
  // we know the system maintained data integrity and rejected the invalid input
}
