import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_trash_list_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test trash list filtering and sorting for deleted private todos.
   *
   * Verifies that a member can only browse their own trashed todos, and that
   * completion-status filtering, date sorting, null-date placement, and
   * pagination all behave consistently after multiple todos are moved into the
   * trash.
   *
   * 1. Register an authenticated member using an isolated connection.
   * 2. Create multiple todos with different completion states and date combinations.
   * 3. Move every prepared todo into trash.
   * 4. Query the trash list with completion filters and sort controls.
   * 5. Validate ordering, null placement, and pagination metadata.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234qwer!",
    } satisfies ITodoAppMember.IJoin,
  });
  const base = new Date(Date.UTC(2026, 0, 1, 9, 0, 0));
  const hour = 1000 * 60 * 60;
  const day = 1000 * 60 * 60 * 24;
  const todoBodies = [
    {
      title: `alpha-${RandomGenerator.alphabets(6)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: new Date(base.getTime() + 3 * day).toISOString(),
      dueDate: new Date(base.getTime() + 10 * day).toISOString(),
    },
    {
      title: `bravo-${RandomGenerator.alphabets(6)}`,
      description: null,
      startDate: null,
      dueDate: new Date(base.getTime() + 7 * day).toISOString(),
    },
    {
      title: `charlie-${RandomGenerator.alphabets(6)}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      startDate: new Date(base.getTime() + 1 * day).toISOString(),
      dueDate: null,
    },
    {
      title: `delta-${RandomGenerator.alphabets(6)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      startDate: new Date(base.getTime() + 5 * day).toISOString(),
      dueDate: new Date(base.getTime() + 5 * day + 6 * hour).toISOString(),
    },
    {
      title: `echo-${RandomGenerator.alphabets(6)}`,
      description: null,
      startDate: null,
      dueDate: null,
    },
  ] satisfies ITodoAppTodo.ICreate[];
  const createdTodos = await ArrayUtil.asyncMap(todoBodies, async (body) => {
    const todo = await api.functional.todoApp.member.todos.create(
      memberConnection,
      {
        body,
      },
    );
    typia.assert(todo);
    return todo;
  });
  const completedTodoIds = new Set<string>([
    createdTodos[0].id,
    createdTodos[3].id,
  ]);
  const trashOrder = [2, 0, 4, 1, 3];
  for (const index of trashOrder)
    await api.functional.todoApp.member.todos.erase(memberConnection, {
      todoId: createdTodos[index].id,
    });
  const trashedTodos = createdTodos.map((todo) => ({
    ...todo,
    isCompleted: completedTodoIds.has(todo.id),
  }));
  const pageLimit = 2;
  const allTrashPage1 = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: pageLimit,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(allTrashPage1);
  const allTrashPage2 = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: pageLimit,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(allTrashPage2);
  const allTrashPage3 = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 3,
        limit: pageLimit,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(allTrashPage3);
  TestValidator.equals(
    "trash pagination records",
    allTrashPage1.pagination.records,
    trashedTodos.length,
  );
  TestValidator.equals(
    "trash pagination pages",
    allTrashPage1.pagination.pages,
    Math.ceil(trashedTodos.length / pageLimit),
  );
  TestValidator.equals(
    "trash pagination current page 1",
    allTrashPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "trash pagination current page 2",
    allTrashPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "trash pagination current page 3",
    allTrashPage3.pagination.current,
    3,
  );
  const sortedByCreatedAsc = [...trashedTodos].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  TestValidator.equals(
    "trash page 1 by createdAt asc",
    allTrashPage1.data.map((todo) => todo.id),
    sortedByCreatedAsc.slice(0, 2).map((todo) => todo.id),
  );
  TestValidator.equals(
    "trash page 2 by createdAt asc",
    allTrashPage2.data.map((todo) => todo.id),
    sortedByCreatedAsc.slice(2, 4).map((todo) => todo.id),
  );
  TestValidator.equals(
    "trash page 3 by createdAt asc",
    allTrashPage3.data.map((todo) => todo.id),
    sortedByCreatedAsc.slice(4, 6).map((todo) => todo.id),
  );
  const completeTrash = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "complete",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(completeTrash);
  TestValidator.equals(
    "complete trash ids",
    completeTrash.data.map((todo) => todo.id),
    trashedTodos.filter((todo) => todo.isCompleted).map((todo) => todo.id),
  );
  TestValidator.predicate(
    "complete trash only completed",
    completeTrash.data.every((todo) => todo.isCompleted),
  );
  const incompleteTrash = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "incomplete",
        sortBy: "createdAt",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(incompleteTrash);
  TestValidator.equals(
    "incomplete trash ids",
    incompleteTrash.data.map((todo) => todo.id),
    trashedTodos.filter((todo) => !todo.isCompleted).map((todo) => todo.id),
  );
  TestValidator.predicate(
    "incomplete trash only incomplete",
    incompleteTrash.data.every((todo) => !todo.isCompleted),
  );
  const byStartAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "startDate",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(byStartAsc);
  const expectedStartAsc = [...trashedTodos].sort((a, b) => {
    if (a.startDate === null && b.startDate === null)
      return a.createdAt.localeCompare(b.createdAt);
    if (a.startDate === null) return 1;
    if (b.startDate === null) return -1;
    return a.startDate.localeCompare(b.startDate);
  });
  TestValidator.equals(
    "startDate asc order",
    byStartAsc.data.map((todo) => todo.id),
    expectedStartAsc.map((todo) => todo.id),
  );
  TestValidator.equals(
    "startDate nulls last in asc",
    byStartAsc.data.slice(-2).map((todo) => todo.startDate),
    [null, null],
  );
  const byStartDesc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "startDate",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(byStartDesc);
  const expectedStartDesc = [...trashedTodos].sort((a, b) => {
    if (a.startDate === null && b.startDate === null)
      return b.createdAt.localeCompare(a.createdAt);
    if (a.startDate === null) return 1;
    if (b.startDate === null) return -1;
    return b.startDate.localeCompare(a.startDate);
  });
  TestValidator.equals(
    "startDate desc order",
    byStartDesc.data.map((todo) => todo.id),
    expectedStartDesc.map((todo) => todo.id),
  );
  TestValidator.predicate(
    "startDate nulls last in desc",
    byStartDesc.data.slice(-2).every((todo) => todo.startDate === null),
  );
  const byDueAsc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "dueDate",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(byDueAsc);
  const expectedDueAsc = [...trashedTodos].sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null)
      return a.createdAt.localeCompare(b.createdAt);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  TestValidator.equals(
    "dueDate asc order",
    byDueAsc.data.map((todo) => todo.id),
    expectedDueAsc.map((todo) => todo.id),
  );
  TestValidator.equals(
    "dueDate nulls last in asc",
    byDueAsc.data.slice(-2).map((todo) => todo.dueDate),
    [null, null],
  );
  const byDueDesc = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "dueDate",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(byDueDesc);
  const expectedDueDesc = [...trashedTodos].sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null)
      return b.createdAt.localeCompare(a.createdAt);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return b.dueDate.localeCompare(a.dueDate);
  });
  TestValidator.equals(
    "dueDate desc order",
    byDueDesc.data.map((todo) => todo.id),
    expectedDueDesc.map((todo) => todo.id),
  );
  TestValidator.predicate(
    "dueDate nulls last in desc",
    byDueDesc.data.slice(-2).every((todo) => todo.dueDate === null),
  );
}
