import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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
 * Test filtering deleted todos by completion status in trash.
 *
 * Validates that the trash listing endpoint correctly filters soft-deleted todos by their completion status. The test creates multiple todos with different completion states, deletes them to populate the trash, and then verifies that filtering by completion_status (null for all, true for complete only, false for incomplete only) returns the correct subset of deleted items.
 *
 * Special attention is given to verifying that the pagination metadata accurately reflects the filtered count and that the completion status filter is applied correctly to soft-deleted items only.
 *
 * 1. Authenticate member account for trash access.
 * 2. Create multiple todos (all incomplete by default as no update API is available).
 * 3. Delete all created todos to populate trash with mixed completion states.
 * 4. Test filtering with completion_status=null returns all deleted todos.
 * 5. Test filtering with completion_status=false returns incomplete deleted todos.
 * 6. Test filtering with completion_status=true returns complete deleted todos (empty in this case).
 * 7. Validate pagination metadata matches filtered result counts.
 */
export async function test_api_trash_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // 2. Create multiple todos (all incomplete by default)
  // Note: No update endpoint is available to mark todos as complete,
  // so all created todos will have completed=false
  const incompleteTodo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Incomplete Todo 1",
        description: "This todo should remain incomplete",
      },
    },
  );
  typia.assert(incompleteTodo1);
  const incompleteTodo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Incomplete Todo 2",
        description: "Another incomplete todo",
      },
    },
  );
  typia.assert(incompleteTodo2);
  const incompleteTodo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Incomplete Todo 3",
        description: "Third incomplete todo",
      },
    },
  );
  typia.assert(incompleteTodo3);
  const incompleteTodo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Incomplete Todo 4",
        description: "Fourth incomplete todo",
      },
    },
  );
  typia.assert(incompleteTodo4);
  // 3. Delete all created todos to populate trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: incompleteTodo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: incompleteTodo2.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: incompleteTodo3.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: incompleteTodo4.id,
  });
  // 4. Test filtering with completion_status=null (all deleted todos)
  const allDeleted = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        completion_status: null,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allDeleted);
  TestValidator.equals("all deleted todos count", allDeleted.data.length, 4);
  TestValidator.equals(
    "all deleted pagination records",
    allDeleted.pagination.records,
    4,
  );
  // 5. Test filtering with completion_status=false (incomplete only)
  const incompleteDeleted = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        completion_status: false,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteDeleted);
  TestValidator.equals(
    "incomplete deleted todos count",
    incompleteDeleted.data.length,
    4,
  );
  TestValidator.equals(
    "incomplete deleted pagination records",
    incompleteDeleted.pagination.records,
    4,
  );
  // Verify all returned items are incomplete
  for (const todo of incompleteDeleted.data) {
    TestValidator.predicate(
      `todo ${todo.id} is incomplete`,
      todo.completed === false,
    );
  }
  // 6. Test filtering with completion_status=true (complete only)
  const completeDeleted = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        completion_status: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeDeleted);
  // Since all created todos are incomplete (no update API available),
  // filtering for complete todos should return empty results
  TestValidator.equals(
    "complete deleted todos count (should be 0)",
    completeDeleted.data.length,
    0,
  );
  TestValidator.equals(
    "complete deleted pagination records (should be 0)",
    completeDeleted.pagination.records,
    0,
  );
  // 7. Items in trash are already confirmed as deleted by the API structure
  // (deleted_at field not available on ISummary type returned by trash endpoint)
}