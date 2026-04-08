import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that an authenticated member can retrieve their own soft-deleted todo by ID.
 *
 * Validates the complete soft-delete and retrieval workflow including member authentication, todo creation, soft-deletion, and retrieval of the deleted todo. Ensures that soft-deleted todos remain accessible to their owners while being hidden from normal list views.
 *
 * Special attention is given to verifying that the isDeleted flag is properly set to true, deletedAt contains a valid timestamp, and all original todo data (title, description, dates) remains intact and accessible after soft-deletion.
 *
 * 1. Member registers and authenticates via POST /todoApp/auth/member/join.
 * 2. Member creates a todo with title, description, and optional dates.
 * 3. Member soft-deletes the todo via DELETE /todoApp/member/todos/{todoId}.
 * 4. Member retrieves the deleted todo via GET /todoApp/member/todos/{todoId}.
 * 5. Validates isDeleted is true, deletedAt is set, and all original data is preserved.
 */
export async function test_api_todo_retrieve_deleted_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Store original values for validation after retrieval
  const originalTitle = todo.title;
  const originalDescription = todo.description;
  const originalStartDate = todo.startDate;
  const originalDueDate = todo.dueDate;
  // 3. Soft-delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Retrieve the deleted todo
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 5. Validate the deleted todo
  TestValidator.equals("todo ID matches", retrievedTodo.id, todo.id);
  TestValidator.equals("title preserved", retrievedTodo.title, originalTitle);
  TestValidator.equals(
    "description preserved",
    retrievedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start date preserved",
    retrievedTodo.startDate,
    originalStartDate,
  );
  TestValidator.equals(
    "due date preserved",
    retrievedTodo.dueDate,
    originalDueDate,
  );
  TestValidator.predicate(
    "isDeleted is true",
    retrievedTodo.isDeleted === true,
  );
  TestValidator.predicate(
    "deletedAt is set",
    retrievedTodo.deletedAt !== null &&
      typeof retrievedTodo.deletedAt === "string" &&
      retrievedTodo.deletedAt.length > 0,
  );
  TestValidator.predicate(
    "isCompleted unchanged",
    retrievedTodo.isCompleted === false,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedTodo.member.id,
    authResult.id,
  );
}
