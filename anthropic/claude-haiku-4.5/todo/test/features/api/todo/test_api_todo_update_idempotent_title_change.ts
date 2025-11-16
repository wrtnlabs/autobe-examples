import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a todo's title multiple times in sequence to ensure each update
 * correctly reflects the latest value.
 *
 * This test validates idempotent title updates by:
 *
 * 1. Creating a user account through registration
 * 2. Creating a todo item with an initial title
 * 3. Updating the title sequentially from value A to B to C
 * 4. Verifying each update correctly replaces the previous value
 * 5. Confirming the final retrieval shows the latest title value
 *
 * The test ensures data integrity during sequential updates and validates that
 * the todo system correctly maintains the most recent title value without data
 * corruption or unexpected rollbacks.
 */
export async function test_api_todo_update_idempotent_title_change(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com",
        referrer: "https://example.com/login",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user authenticated successfully",
    user.token !== null,
  );

  // Step 2: Create initial todo with title A
  const titleA = RandomGenerator.paragraph({ sentences: 2 });
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: titleA,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "initial todo title matches created value",
    createdTodo.title,
    titleA,
  );

  // Step 3: Update todo title to B
  const titleB = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodoB: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: titleB,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodoB);
  TestValidator.equals("todo title updated to B", updatedTodoB.title, titleB);
  TestValidator.notEquals(
    "updated_at timestamp changed after first update",
    updatedTodoB.updated_at,
    createdTodo.updated_at,
  );

  // Step 4: Update todo title to C
  const titleC = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodoC: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: titleC,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodoC);
  TestValidator.equals("todo title updated to C", updatedTodoC.title, titleC);
  TestValidator.notEquals(
    "updated_at timestamp changed after second update",
    updatedTodoC.updated_at,
    updatedTodoB.updated_at,
  );

  // Step 5: Verify idempotency - update with the same title C again
  const idempotentTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: titleC,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(idempotentTodo);
  TestValidator.equals(
    "idempotent update maintains title C",
    idempotentTodo.title,
    titleC,
  );
  TestValidator.equals(
    "idempotent update maintains same content",
    idempotentTodo.title,
    updatedTodoC.title,
  );

  // Step 6: Verify sequential update correctness
  TestValidator.predicate(
    "title progression is correct: A→B→C",
    titleA !== titleB && titleB !== titleC && titleA !== titleC,
  );
  TestValidator.equals(
    "final title is C as expected",
    updatedTodoC.title,
    titleC,
  );
  TestValidator.notEquals(
    "title has been updated from initial value A",
    updatedTodoC.title,
    titleA,
  );
  TestValidator.notEquals(
    "title has been updated from intermediate value B",
    updatedTodoC.title,
    titleB,
  );
}
