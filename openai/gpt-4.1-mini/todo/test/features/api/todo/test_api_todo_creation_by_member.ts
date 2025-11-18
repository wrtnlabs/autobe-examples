import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";

/**
 * Validate todo creation by authenticated todoListMember.
 *
 * This test covers all business rules for the creation of todos:
 *
 * - Register and authenticate a unique user
 * - Successfully create todos with:
 *
 *   - Minimum and maximum length titles/description
 *   - Various is_complete statuses
 * - Confirm API enforces:
 *
 *   - Title uniqueness per user
 *   - Required (non-blank) title
 *   - Optional and nullable description
 *   - Is_complete correct propagation
 * - Check for failure when using duplicate title, blank title, or creating
 *   unauthenticated.
 * - Ensure response matches ITodoListTodo contract.
 */
export async function test_api_todo_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register & authenticate a new todoListMember
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphabets(10);
  const joinBody = {
    email,
    password,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ITodoListTodolistmember.ICreate;
  const member: ITodoListTodolistmember.IAuthorized =
    await api.functional.auth.todoListMember.join(connection, {
      body: joinBody,
    });
  typia.assert(member);
  TestValidator.equals(
    "auth email matches input",
    member.email,
    joinBody.email,
  );

  // 2. Create todo with minimum field lengths
  const minTitle = "a"; // 1 char, MinLength=1
  const todoMin: ITodoListTodo =
    await api.functional.todoList.todoListMember.todos.create(connection, {
      body: {
        title: minTitle,
        is_complete: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoMin);
  TestValidator.equals("min title matches", todoMin.title, minTitle);
  TestValidator.equals("is_complete false", todoMin.is_complete, false);
  TestValidator.equals(
    "description omitted is undefined/null",
    todoMin.description,
    undefined,
  );

  // 3. Create todo with maximum allowed field lengths and completed status
  const maxTitle = RandomGenerator.alphabets(100);
  const maxDesc = RandomGenerator.alphabets(1000);
  const todoMax: ITodoListTodo =
    await api.functional.todoList.todoListMember.todos.create(connection, {
      body: {
        title: maxTitle,
        description: maxDesc,
        is_complete: true,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoMax);
  TestValidator.equals("max title matches", todoMax.title, maxTitle);
  TestValidator.equals("max desc matches", todoMax.description, maxDesc);
  TestValidator.equals("is_complete true", todoMax.is_complete, true);
  TestValidator.predicate(
    "completed_at present when complete",
    todoMax.completed_at !== null && todoMax.completed_at !== undefined,
  );

  // 4. Create todo with description explicitly set to null
  const nullDescTitle = RandomGenerator.paragraph({ sentences: 3, wordMin: 5 });
  const todoNullDesc: ITodoListTodo =
    await api.functional.todoList.todoListMember.todos.create(connection, {
      body: {
        title: nullDescTitle,
        description: null,
        is_complete: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoNullDesc);
  TestValidator.equals("description is null", todoNullDesc.description, null);

  // 5. Confirm per-user title uniqueness: fail with duplicate title
  await TestValidator.error("fail on duplicate title", async () => {
    await api.functional.todoList.todoListMember.todos.create(connection, {
      body: {
        title: minTitle,
        is_complete: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // 6. Confirm title must not be blank
  await TestValidator.error("fail on blank title", async () => {
    await api.functional.todoList.todoListMember.todos.create(connection, {
      body: {
        title: "",
        is_complete: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // 7. Unauthenticated creation attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("fail unauthenticated todo create", async () => {
    await api.functional.todoList.todoListMember.todos.create(unauthConn, {
      body: {
        title: RandomGenerator.name(2),
        is_complete: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });
}
