import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Update a Todo's title and toggle its completion state, validating timestamps.
 *
 * Business context:
 *
 * - Single-member Todo app. We first register (join) to obtain auth context.
 * - Create a Todo, then update only the title.
 * - Toggle completion to true, then back to false.
 *
 * Validations per step:
 *
 * 1. Join: typia.assert on authorized payload; rely on SDK-managed auth header.
 * 2. Create: typia.assert on ITodoListTodo; capture createdAt/updatedAt.
 * 3. Title update: id stable, title changed, isCompleted remains false, createdAt
 *    unchanged, updatedAt advanced and >= createdAt.
 * 4. Toggle completion to true: id stable, isCompleted true, title unchanged,
 *    createdAt unchanged, updatedAt advanced and >= createdAt.
 * 5. Toggle completion to false: isCompleted false again; same timestamp rules.
 */
export async function test_api_todo_update_title_and_completion_toggle(
  connection: api.IConnection,
) {
  // Helper to generate a safe single-line title within 100 characters
  const makeTitle = (maxLen: number): string => {
    const raw = RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    })
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const cut = raw.slice(0, Math.max(1, Math.min(maxLen, 100))).trim();
    return cut.length > 0 ? cut : "task";
  };

  // 1) Join as a new member (SDK will store token into connection.headers)
  const joinOutput = await api.functional.auth.todoMember.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert(joinOutput);

  // 2) Create a baseline Todo
  const initialTitle = makeTitle(48);
  const created = await api.functional.todoList.todos.create(connection, {
    body: {
      title: initialTitle,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(created);

  // Validate defaults
  TestValidator.predicate(
    "created isCompleted defaults to false",
    created.isCompleted === false,
  );
  // Capture baseline timestamps
  const createdAt0 = Date.parse(created.createdAt);
  const updatedAt0 = Date.parse(created.updatedAt);
  TestValidator.predicate(
    "createdAt is valid ISO and non-negative",
    Number.isFinite(createdAt0) && createdAt0 >= 0,
  );
  TestValidator.predicate(
    "updatedAt is valid ISO and non-negative",
    Number.isFinite(updatedAt0) && updatedAt0 >= 0,
  );
  TestValidator.predicate(
    "updatedAt >= createdAt on creation",
    updatedAt0 >= createdAt0,
  );

  // 3) Update title only
  const nextTitle = makeTitle(50);
  const updated1 = await api.functional.todoList.todos.update(connection, {
    todoId: created.id,
    body: {
      title: nextTitle,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(updated1);

  TestValidator.equals(
    "id remains same after title update",
    updated1.id,
    created.id,
  );
  TestValidator.equals("title updated correctly", updated1.title, nextTitle);
  TestValidator.predicate(
    "isCompleted remains false after title-only update",
    updated1.isCompleted === false,
  );
  TestValidator.equals(
    "createdAt remains immutable after title update",
    updated1.createdAt,
    created.createdAt,
  );

  const updatedAt1 = Date.parse(updated1.updatedAt);
  TestValidator.predicate(
    "updatedAt advanced after title update and >= createdAt",
    updatedAt1 > updatedAt0 && updatedAt1 >= createdAt0,
  );

  // 4) Toggle completion to true
  const completed = await api.functional.todoList.todos.update(connection, {
    todoId: created.id,
    body: {
      is_completed: true,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(completed);

  TestValidator.equals(
    "id remains same after toggle to true",
    completed.id,
    created.id,
  );
  TestValidator.equals(
    "title unchanged when toggling completion on",
    completed.title,
    updated1.title,
  );
  TestValidator.predicate(
    "isCompleted becomes true",
    completed.isCompleted === true,
  );
  TestValidator.equals(
    "createdAt still immutable after completion on",
    completed.createdAt,
    created.createdAt,
  );

  const updatedAt2 = Date.parse(completed.updatedAt);
  TestValidator.predicate(
    "updatedAt advanced after completion on and >= createdAt",
    updatedAt2 > updatedAt1 && updatedAt2 >= createdAt0,
  );

  // 5) Toggle completion back to false
  const reopened = await api.functional.todoList.todos.update(connection, {
    todoId: created.id,
    body: {
      is_completed: false,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(reopened);

  TestValidator.equals(
    "id remains same after toggle back to false",
    reopened.id,
    created.id,
  );
  TestValidator.equals(
    "title remains unchanged after toggle back",
    reopened.title,
    updated1.title,
  );
  TestValidator.predicate(
    "isCompleted becomes false again",
    reopened.isCompleted === false,
  );
  TestValidator.equals(
    "createdAt still immutable after reopening",
    reopened.createdAt,
    created.createdAt,
  );

  const updatedAt3 = Date.parse(reopened.updatedAt);
  TestValidator.predicate(
    "updatedAt advanced after completion off and >= createdAt",
    updatedAt3 > updatedAt2 && updatedAt3 >= createdAt0,
  );
}
