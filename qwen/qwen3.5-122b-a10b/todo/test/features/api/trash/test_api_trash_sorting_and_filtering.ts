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
 * Test trash sorting and filtering functionality.
 * 1. Member authenticates via join
 * 2. Create multiple todos with different date characteristics
 * 3. Soft delete all todos
 * 4. Test sorting by deleted_at descending
 * 5. Test sorting by created_at ascending
 * 6. Verify NULL date handling in sorting (todos without dates appear at end)
 * 7. Test ownership isolation
 */
export async function test_api_trash_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create multiple todos with different date characteristics
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 5).toISOString(); // 5 days ago
  const futureDate = new Date(now.getTime() + 86400000 * 10).toISOString(); // 10 days later
  // Todo with both start and due dates
  const todoWithDates = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with start and due dates",
        description: "This todo has both start and due dates",
        startDate: pastDate,
        dueDate: futureDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithDates);
  // Todo with only start date
  const todoWithStartDate = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with only start date",
        description: "This todo has only start date",
        startDate: pastDate,
        dueDate: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithStartDate);
  // Todo without dates (null start_date and due_date)
  const todoWithoutDates = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo without dates",
        description: "This todo has no start or due dates",
        startDate: null,
        dueDate: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithoutDates);
  // 3. Soft delete all todos (with small delay to ensure different deleted_at timestamps)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoWithDates.id,
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoWithStartDate.id,
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoWithoutDates.id,
  });
  // 4. Test sorting by deleted_at descending (most recently deleted first)
  const trashByDeletedAtDesc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sortBy: "deletedAt",
        sortOrder: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashByDeletedAtDesc);
  TestValidator.equals(
    "deleted_at desc count",
    trashByDeletedAtDesc.data.length,
    3,
  );
  TestValidator.predicate(
    "most recently deleted first",
    trashByDeletedAtDesc.data[0].id === todoWithoutDates.id,
  );
  TestValidator.predicate(
    "second most recent",
    trashByDeletedAtDesc.data[1].id === todoWithStartDate.id,
  );
  TestValidator.predicate(
    "oldest deleted last",
    trashByDeletedAtDesc.data[2].id === todoWithDates.id,
  );
  // 5. Test sorting by created_at ascending (oldest created first)
  const trashByCreatedAtAsc =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashByCreatedAtAsc);
  TestValidator.equals(
    "created_at asc count",
    trashByCreatedAtAsc.data.length,
    3,
  );
  TestValidator.predicate(
    "oldest created first",
    trashByCreatedAtAsc.data[0].id === todoWithDates.id,
  );
  TestValidator.predicate(
    "second oldest",
    trashByCreatedAtAsc.data[1].id === todoWithStartDate.id,
  );
  TestValidator.predicate(
    "newest created last",
    trashByCreatedAtAsc.data[2].id === todoWithoutDates.id,
  );
  // 6. Test sorting by start_date - todos with NULL dates should appear at end
  const trashByStartDate =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        sortBy: "startDate",
        sortOrder: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(trashByStartDate);
  TestValidator.equals(
    "start_date sort count",
    trashByStartDate.data.length,
    3,
  );
  TestValidator.predicate(
    "todo with null start_date appears at end",
    trashByStartDate.data[2].id === todoWithoutDates.id,
  );
  TestValidator.predicate(
    "todos with start_date appear before null",
    trashByStartDate.data[0].start_date !== null &&
      trashByStartDate.data[1].start_date !== null,
  );
  // 7. Test sorting by due_date - todos with NULL dates should appear at end
  const trashByDueDate = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashByDueDate);
  TestValidator.equals("due_date sort count", trashByDueDate.data.length, 3);
  TestValidator.predicate(
    "todo with null due_date appears at end",
    trashByDueDate.data[2].id === todoWithoutDates.id,
  );
  TestValidator.predicate(
    "todos with due_date appear before null",
    trashByDueDate.data[0].due_date !== null &&
      trashByDueDate.data[1].due_date !== null,
  );
}
