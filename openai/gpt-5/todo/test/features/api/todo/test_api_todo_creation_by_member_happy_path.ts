import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Happy-path creation of a Todo by an authenticated member.
 *
 * Flow:
 *
 * 1. Register a new todoMember via auth join to acquire an authenticated context.
 * 2. Create a Todo with a valid, single-line title (with intentional surrounding
 *    spaces) to verify trimming.
 * 3. Validate business invariants on the creation response:
 *
 *    - Title equals trimmed input
 *    - IsCompleted is false by default
 *    - UpdatedAt is greater than or equal to createdAt
 *    - CompletedAt is null or undefined when not completed
 */
export async function test_api_todo_creation_by_member_happy_path(
  connection: api.IConnection,
) {
  // 1) Authenticate: register member and obtain SDK-managed Authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Prepare a valid, single-line title (<= 100 chars), with intentional spaces for trimming verification
  const base = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  }).slice(0, 100);
  const rawTitle = `  ${base.trim()}  `; // enforce single-line and add surrounding spaces
  const expectedTitle = rawTitle.trim();

  // 3) Create Todo
  const created = await api.functional.todoList.todos.create(connection, {
    body: {
      title: rawTitle,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(created);

  // 4) Business invariants
  TestValidator.equals(
    "title equals trimmed input",
    created.title,
    expectedTitle,
  );
  TestValidator.equals(
    "isCompleted defaults to false on create",
    created.isCompleted,
    false,
  );

  const createdAtMs = new Date(created.createdAt).getTime();
  const updatedAtMs = new Date(created.updatedAt).getTime();
  TestValidator.predicate("updatedAt >= createdAt", updatedAtMs >= createdAtMs);

  TestValidator.predicate(
    "completedAt is null or undefined when not completed",
    created.completedAt === null || created.completedAt === undefined,
  );
}
