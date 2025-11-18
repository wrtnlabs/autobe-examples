import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate todo creation for a newly joined user, check status, audit fields,
 * and title uniqueness enforcement.
 *
 * 1. Register a new user (join)
 * 2. Create a todo with random title, description, due_date. Check all
 *    server-assigned fields.
 * 3. Attempt to create a duplicate-title todo (should fail)
 * 4. Successfully create a todo with a different title
 */
export async function test_api_todo_creation_by_new_user(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://app.example.com/" + RandomGenerator.alphaNumeric(8);
  const referrer = "https://google.com/";
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoAppUser.IJoin;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);

  // 2. Create a todo
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 }).slice(0, 30);
  const todoDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  const createBody = {
    title: todoTitle,
    description: todoDesc,
    due_date: dueDate,
  } satisfies ITodoAppTodo.ICreate;
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    { body: createBody },
  );
  typia.assert(todo);

  // Validate ownership and fields
  TestValidator.equals(
    "user id matches todo ownership",
    todo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals("todo title matches", todo.title, createBody.title);
  TestValidator.equals(
    "todo description matches",
    todo.description,
    createBody.description,
  );
  TestValidator.equals(
    "todo due date matches",
    todo.due_date,
    createBody.due_date,
  );
  TestValidator.equals("todo status is active", todo.status, "active");
  TestValidator.predicate(
    "created_at is valid",
    typeof todo.created_at === "string" && todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    typeof todo.updated_at === "string" && todo.updated_at.length > 0,
  );
  TestValidator.equals("completed_at is null", todo.completed_at, null);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);

  // 3. Attempt duplicate-title todo
  const duplicateBody = { ...createBody } satisfies ITodoAppTodo.ICreate;
  await TestValidator.error(
    "Cannot create duplicate title todo for same user",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: duplicateBody,
      });
    },
  );

  // 4. Create a different title todo (should succeed)
  const anotherBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }).slice(0, 30),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 7,
    }),
    due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const todo2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    { body: anotherBody },
  );
  typia.assert(todo2);
  TestValidator.notEquals(
    "unique constraint satisfied - diff todo ids",
    todo2.id,
    todo.id,
  );
  TestValidator.equals(
    "another todo title matches",
    todo2.title,
    anotherBody.title,
  );
  TestValidator.equals("another todo status is active", todo2.status, "active");
}
