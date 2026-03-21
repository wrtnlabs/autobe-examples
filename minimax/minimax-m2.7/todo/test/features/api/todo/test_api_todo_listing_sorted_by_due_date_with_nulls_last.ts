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

export async function test_api_todo_listing_sorted_by_due_date_with_nulls_last(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create todos with various due date configurations
  const baseDate = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  // Create 3 todos WITH due dates (different dates for sorting)
  const todoWithEarlyDate =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          dueDate: new Date(baseDate.getTime() + 1 * dayMs).toISOString(),
        },
      },
    );
  typia.assert(todoWithEarlyDate);
  const todoWithMidDate =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          dueDate: new Date(baseDate.getTime() + 3 * dayMs).toISOString(),
        },
      },
    );
  typia.assert(todoWithMidDate);
  const todoWithLateDate =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          dueDate: new Date(baseDate.getTime() + 5 * dayMs).toISOString(),
        },
      },
    );
  typia.assert(todoWithLateDate);
  // Create 2 todos WITHOUT due dates (should appear at end)
  const todoWithoutDate1 =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          dueDate: null,
        },
      },
    );
  typia.assert(todoWithoutDate1);
  const todoWithoutDate2 =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          dueDate: undefined,
        },
      },
    );
  typia.assert(todoWithoutDate2);
  // 3. List todos sorted by dueDate ascending
  const listResponse = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "asc",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(listResponse);
  // 4. Validate: todos without due dates should appear at the end
  const todos = listResponse.data;
  const todosWithDueDates = todos.filter((t) => t.due_date !== null);
  const todosWithoutDueDates = todos.filter((t) => t.due_date === null);
  // Validate that todos without due dates appear at the end
  TestValidator.equals(
    "should have todos without due dates at the end",
    todosWithoutDueDates.length > 0,
    true,
  );
  // Get the indices of todos without due dates
  const indicesWithoutDueDate = todos
    .map((t, i) => (t.due_date === null ? i : -1))
    .filter((i) => i !== -1);
  // All todos without due dates should be at the end (after all todos with due dates)
  const lastIndexWithDueDate = Math.max(
    ...todos.map((t, i) => (t.due_date !== null ? i : -1)),
  );
  for (const idx of indicesWithoutDueDate) {
    TestValidator.predicate(
      `todo without due date at index ${idx} should be after all todos with due dates (last index: ${lastIndexWithDueDate})`,
      idx > lastIndexWithDueDate,
    );
  }
  // 5. Validate ascending order of todos with due dates
  const sortedWithDueDates = [...todosWithDueDates].sort((a, b) => {
    const dateA = new Date(a.due_date!).getTime();
    const dateB = new Date(b.due_date!).getTime();
    return dateA - dateB;
  });
  TestValidator.equals(
    "todos with due dates should be in ascending order",
    todosWithDueDates.map((t) => t.id),
    sortedWithDueDates.map((t) => t.id),
  );
  // 6. Validate all created todos are present
  const allTodoIds = [
    todoWithEarlyDate.id,
    todoWithMidDate.id,
    todoWithLateDate.id,
    todoWithoutDate1.id,
    todoWithoutDate2.id,
  ];
  for (const todoId of allTodoIds) {
    TestValidator.predicate(
      `todo ${todoId} should be in list`,
      listResponse.data.some((t) => t.id === todoId),
    );
  }
}
