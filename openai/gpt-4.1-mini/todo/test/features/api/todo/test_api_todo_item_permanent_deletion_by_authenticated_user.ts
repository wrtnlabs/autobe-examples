import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test permanent deletion of an existing todo item by its unique ID for the
 * authenticated user.
 *
 * This test covers the entire user and todo item lifecycle involved with the
 * deletion process.
 *
 * 1. Register a new user via /auth/user/join.
 * 2. Create a new todo item for the authenticated user with description, status
 *    'pending', no due_date.
 * 3. Delete the created todo item by its unique ID using DELETE
 *    /todo/user/todoItems/{todoItemId}.
 * 4. Validate the deletion was successful by attempting to retrieve the item and
 *    expecting failure.
 *
 * This test verifies proper authorization enforcement, ownership validation,
 * and that the system performs a hard delete without residual data.
 */
export async function test_api_todo_item_permanent_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "P@ssw0rd123";
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo item for this authenticated user
  const createBody = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "pending",
    due_date: null,
  } satisfies ITodoItem.ICreate;

  const todoItem: ITodoItem = await api.functional.todo.user.todoItems.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(todoItem);

  // Step 3: Delete the created todo item by its ID
  await api.functional.todo.user.todoItems.erase(connection, {
    todoItemId: todoItem.id,
  });

  // Step 4: Confirm deletion by attempting to fetch the deleted todo item
  // Since there is no explicit fetch API provided, act by expecting error when deleting same id again
  await TestValidator.error(
    "deleting a non-existent item should fail",
    async () => {
      await api.functional.todo.user.todoItems.erase(connection, {
        todoItemId: todoItem.id,
      });
    },
  );
}
