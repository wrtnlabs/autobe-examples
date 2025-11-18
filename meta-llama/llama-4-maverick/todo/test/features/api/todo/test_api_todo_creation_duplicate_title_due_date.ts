import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Ensures that a user cannot create two todo items with the same title and
 * due_date.
 *
 * 1. Register a new todo user (POST /auth/user/join) to obtain authentication.
 * 2. Create a todo specifying a unique title and due date.
 * 3. Attempt to create another todo with the exact same title and due date (other
 *    fields may differ).
 * 4. Confirm the first create call succeeds with expected persisted data, then
 *    verify the second call triggers uniqueness violation error.
 * 5. Ensure the failed second create does not insert or alter any todo.
 */
export async function test_api_todo_creation_duplicate_title_due_date(
  connection: api.IConnection,
) {
  // 1. Register a new todo user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href =
    "https://test-app/autobe-e2e/" + RandomGenerator.alphaNumeric(10);
  const referrer = "https://referrer-site/" + RandomGenerator.alphaNumeric(8);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Prepare duplicate title and due date
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const dueDate = new Date(Date.now() + 86400000).toISOString(); // +1 day

  // 3. Create first todo
  const todoInput = {
    title: todoTitle,
    due_date: dueDate,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoTodo.ICreate;
  const created = await api.functional.todo.user.todos.create(connection, {
    body: todoInput,
  });
  typia.assert(created);
  TestValidator.equals(
    "created todo item matches input title",
    created.title,
    todoInput.title,
  );
  if (created.due_date !== null && created.due_date !== undefined) {
    TestValidator.equals(
      "created todo item matches due date",
      created.due_date,
      todoInput.due_date,
    );
  }
  TestValidator.equals(
    "created todo item priority matches",
    created.priority,
    todoInput.priority,
  );
  TestValidator.equals(
    "created todo is not completed",
    created.is_completed,
    false,
  );
  TestValidator.predicate(
    "todo id is valid uuid",
    typeof created.id === "string" && created.id.length > 0,
  );

  // 4. Attempt to create duplicate todo (same title + due date)
  await TestValidator.error(
    "cannot create another todo with same title and due date per user",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: todoInput,
      });
    },
  );

  // 5. Confirm state of the originally created todo remains unchanged (no fetch/list API available here for further verification)
}
