import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test sorting trash list by start date and due date with null value handling.
 *
 * This test validates that:
 * 1. Todos without start dates appear at the end when sorting by startedAt (both asc/desc)
 * 2. Todos without due dates appear at the end when sorting by dueAt (both asc/desc)
 * 3. Sorting by createdAt works correctly
 * 4. Pagination metadata is accurate for trash list queries
 *
 * Workflow:
 * 1. Register a new member account
 * 2. Create 6 todos with varying date configurations:
 *    - 2 todos with both started_at and due_at set
 *    - 2 todos with started_at set but due_at null
 *    - 2 todos with both started_at and due_at null
 * 3. Soft delete all todos to move them to trash
 * 4. Test trash list sorting by startedAt (asc and desc)
 * 5. Test trash list sorting by dueAt (asc and desc)
 * 6. Test trash list sorting by createdAt (asc and desc)
 * 7. Validate pagination metadata for each query
 */
export async function test_api_trash_list_sorting_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create todos with varying date configurations
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  // Todo 1: Both dates set (earliest)
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date(now.getTime() + oneDay).toISOString(),
        due_at: new Date(now.getTime() + 3 * oneDay).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Todo 2: Both dates set (later)
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date(now.getTime() + 2 * oneDay).toISOString(),
        due_at: new Date(now.getTime() + 5 * oneDay).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Todo 3: started_at set, due_at null (earlier start)
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date(now.getTime() + 0.5 * oneDay).toISOString(),
        due_at: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Todo 4: started_at set, due_at null (later start)
  const todo4 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: new Date(now.getTime() + 4 * oneDay).toISOString(),
        due_at: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // Todo 5: Both dates null
  const todo5 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: null,
        due_at: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo5);
  // Todo 6: Both dates null
  const todo6 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        started_at: null,
        due_at: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo6);
  const allTodos = [todo1, todo2, todo3, todo4, todo5, todo6];
  // 3. Soft delete all todos to move them to trash
  for (const todo of allTodos) {
    await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
      todoId: todo.id,
    });
  }
  // 4. Test trash list sorting by startedAt ascending
  const trashByStartedAtAsc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "startedAt",
          sortDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashByStartedAtAsc);
  TestValidator.equals("trash count", trashByStartedAtAsc.data.length, 6);
  TestValidator.equals(
    "pagination current page",
    trashByStartedAtAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records",
    trashByStartedAtAsc.pagination.records,
    6,
  );
  TestValidator.equals(
    "pagination pages",
    trashByStartedAtAsc.pagination.pages,
    1,
  );
  // Verify null started_at todos appear at the end
  const todosWithStartedAt = trashByStartedAtAsc.data.filter(
    (t) => t.startedAt !== null && t.startedAt !== undefined,
  );
  const todosWithoutStartedAt = trashByStartedAtAsc.data.filter(
    (t) => t.startedAt === null || t.startedAt === undefined,
  );
  // Check that todos with started_at come before those without
  const lastWithStartedAtIndex = trashByStartedAtAsc.data.findIndex(
    (t) => t.startedAt === null || t.startedAt === undefined,
  );
  if (lastWithStartedAtIndex !== -1) {
    const remainingTodos = trashByStartedAtAsc.data.slice(
      lastWithStartedAtIndex,
    );
    TestValidator.predicate(
      "all remaining todos have null startedAt",
      remainingTodos.every(
        (t) => t.startedAt === null || t.startedAt === undefined,
      ),
    );
  }
  // 5. Test trash list sorting by startedAt descending
  const trashByStartedAtDesc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "startedAt",
          sortDirection: "desc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashByStartedAtDesc);
  TestValidator.equals("trash count desc", trashByStartedAtDesc.data.length, 6);
  // Verify null started_at todos still appear at the end in desc order
  const firstNullStartedAtIndex = trashByStartedAtDesc.data.findIndex(
    (t) => t.startedAt === null || t.startedAt === undefined,
  );
  if (firstNullStartedAtIndex !== -1) {
    const remainingTodos = trashByStartedAtDesc.data.slice(
      firstNullStartedAtIndex,
    );
    TestValidator.predicate(
      "all remaining todos have null startedAt in desc",
      remainingTodos.every(
        (t) => t.startedAt === null || t.startedAt === undefined,
      ),
    );
  }
  // 6. Test trash list sorting by dueAt ascending
  const trashByDueAtAsc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "dueAt",
          sortDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashByDueAtAsc);
  TestValidator.equals("trash count dueAt asc", trashByDueAtAsc.data.length, 6);
  // Verify null due_at todos appear at the end
  const firstNullDueAtIndex = trashByDueAtAsc.data.findIndex(
    (t) => t.dueAt === null || t.dueAt === undefined,
  );
  if (firstNullDueAtIndex !== -1) {
    const remainingTodos = trashByDueAtAsc.data.slice(firstNullDueAtIndex);
    TestValidator.predicate(
      "all remaining todos have null dueAt",
      remainingTodos.every((t) => t.dueAt === null || t.dueAt === undefined),
    );
  }
  // 7. Test trash list sorting by dueAt descending
  const trashByDueAtDesc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "dueAt",
          sortDirection: "desc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashByDueAtDesc);
  TestValidator.equals(
    "trash count dueAt desc",
    trashByDueAtDesc.data.length,
    6,
  );
  // Verify null due_at todos still appear at the end in desc order
  const firstNullDueAtDescIndex = trashByDueAtDesc.data.findIndex(
    (t) => t.dueAt === null || t.dueAt === undefined,
  );
  if (firstNullDueAtDescIndex !== -1) {
    const remainingTodos = trashByDueAtDesc.data.slice(firstNullDueAtDescIndex);
    TestValidator.predicate(
      "all remaining todos have null dueAt in desc",
      remainingTodos.every((t) => t.dueAt === null || t.dueAt === undefined),
    );
  }
  // 8. Test trash list sorting by createdAt ascending
  const trashByCreatedAtAsc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashByCreatedAtAsc);
  TestValidator.equals(
    "trash count createdAt asc",
    trashByCreatedAtAsc.data.length,
    6,
  );
  // Verify createdAt sorting maintains order (all have createdAt)
  for (let i = 1; i < trashByCreatedAtAsc.data.length; i++) {
    const prevDate = new Date(
      trashByCreatedAtAsc.data[i - 1].createdAt,
    ).getTime();
    const currDate = new Date(trashByCreatedAtAsc.data[i].createdAt).getTime();
    TestValidator.predicate(
      `createdAt order ${i - 1} to ${i}`,
      prevDate <= currDate,
    );
  }
  // 9. Test trash list sorting by createdAt descending
  const trashByCreatedAtDesc =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortDirection: "desc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashByCreatedAtDesc);
  TestValidator.equals(
    "trash count createdAt desc",
    trashByCreatedAtDesc.data.length,
    6,
  );
  // Verify createdAt sorting maintains descending order
  for (let i = 1; i < trashByCreatedAtDesc.data.length; i++) {
    const prevDate = new Date(
      trashByCreatedAtDesc.data[i - 1].createdAt,
    ).getTime();
    const currDate = new Date(trashByCreatedAtDesc.data[i].createdAt).getTime();
    TestValidator.predicate(
      `createdAt desc order ${i - 1} to ${i}`,
      prevDate >= currDate,
    );
  }
  // 10. Test pagination with limit
  const trashPaginated =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortDirection: "asc",
          page: 1,
          limit: 3,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashPaginated);
  TestValidator.equals("paginated trash count", trashPaginated.data.length, 3);
  TestValidator.equals(
    "pagination current",
    trashPaginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", trashPaginated.pagination.limit, 3);
  TestValidator.equals(
    "pagination records",
    trashPaginated.pagination.records,
    6,
  );
  TestValidator.equals("pagination pages", trashPaginated.pagination.pages, 2);
  // Get second page
  const trashPage2 =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortDirection: "asc",
          page: 2,
          limit: 3,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(trashPage2);
  TestValidator.equals("page 2 count", trashPage2.data.length, 3);
  TestValidator.equals("page 2 current", trashPage2.pagination.current, 2);
}
