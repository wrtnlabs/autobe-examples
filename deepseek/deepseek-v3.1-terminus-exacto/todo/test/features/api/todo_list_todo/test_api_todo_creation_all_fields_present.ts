import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate creation of a todo item with all available fields specified under a
 * newly registered user.
 *
 * 1. Register a fresh user account for isolation and authentication.
 * 2. Compose a complete todo payload (unique title, valid status, rich
 *    description, future due_date).
 * 3. Create a todo using authenticated context.
 * 4. Assert the returned todo reflects all input values precisely, including
 *    business rules:
 *
 *    - Title must be unique to this user
 *    - Description (if provided) up to 1000 chars and not null
 *    - Due date is not in the past
 *    - Status must be one of allowed values
 * 5. Attempt duplicate title creation and assert error (uniqueness enforced).
 * 6. Attempt creation with a past due_date and assert error (validation enforced).
 */
export async function test_api_todo_creation_all_fields_present(
  connection: api.IConnection,
) {
  // 1. Register a fresh user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Compose a unique todo payload with all fields
  const baseTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 15,
  });
  const fullTodoPayload = {
    title: baseTitle,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 25,
      sentenceMax: 40,
      wordMin: 4,
      wordMax: 15,
    }),
    status: RandomGenerator.pick(["pending", "completed", "archived"] as const),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days in the future
  } satisfies ITodoListTodo.ICreate;

  // 3. Create todo and verify response matches
  const created: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: fullTodoPayload,
    });
  typia.assert(created);
  TestValidator.equals(
    "returned todo title matches input",
    created.title,
    fullTodoPayload.title,
  );
  TestValidator.equals(
    "returned todo status matches input",
    created.status,
    fullTodoPayload.status,
  );
  TestValidator.equals(
    "returned todo description matches input",
    created.description,
    fullTodoPayload.description,
  );
  TestValidator.equals(
    "returned todo due_date matches input",
    created.due_date,
    fullTodoPayload.due_date,
  );
  TestValidator.predicate(
    "todo has valid id",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.equals(
    "todo belongs to correct user",
    created.todo_list_user_id,
    user.id,
  );
  TestValidator.predicate(
    "created_at is a valid ISO datetime",
    typeof created.created_at === "string" &&
      !isNaN(Date.parse(created.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO datetime",
    typeof created.updated_at === "string" &&
      !isNaN(Date.parse(created.updated_at)),
  );

  // 4. Attempt duplicate title (should fail - enforced uniqueness)
  await TestValidator.error("duplicate todo title rejected", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: { ...fullTodoPayload },
    });
  });

  // 5. Attempt past due_date (should fail - validation)
  await TestValidator.error(
    "creation with past due_date is rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          ...fullTodoPayload,
          title:
            RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 10,
              wordMax: 15,
            }) + "_past",
          due_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
      });
    },
  );
}
