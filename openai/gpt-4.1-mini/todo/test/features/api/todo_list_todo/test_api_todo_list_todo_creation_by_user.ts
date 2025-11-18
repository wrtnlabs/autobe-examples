import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_todo_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration via join API
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: { email, name } satisfies ITodoListTodoListUser.ICreate,
    });
  typia.assert(user);

  // 2. Creating a todo item for the authenticated user
  // Construct a todo creation request with title, optional description, and isComplete false
  const title = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const createBody = {
    title,
    description,
    isComplete: false,
  } satisfies ITodoListTodo.ICreate;

  const todo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.create(connection, {
      body: createBody,
    });
  typia.assert(todo);

  // Validate business rules
  TestValidator.equals("todo title matches created", todo.title, title);
  TestValidator.equals(
    "todo description matches created",
    todo.description ?? null,
    description ?? null,
  );
  TestValidator.equals("todo marked as incomplete", todo.isComplete, false);
  TestValidator.equals("todo linked to user", todo.todoListUserId, user.id);

  // Validate timestamps are non-empty ISO date-time strings
  const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
  TestValidator.predicate(
    "createdAt matches ISO date-time pattern",
    typeof todo.createdAt === "string" && isoDateTimeRegex.test(todo.createdAt),
  );
  TestValidator.predicate(
    "updatedAt matches ISO date-time pattern",
    typeof todo.updatedAt === "string" && isoDateTimeRegex.test(todo.updatedAt),
  );
}
