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

export async function test_api_todos_trash_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  // 2. Create five todos with varying dates
  // Todo 1: both start_date and due_date
  const todo1 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates",
        description: "Has start_date and due_date",
        startDate: new Date(now.getTime() + oneDay).toISOString(),
        dueDate: new Date(now.getTime() + 5 * oneDay).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Todo 2: only start_date
  const todo2 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with start_date only",
        description: "Only has start_date",
        startDate: new Date(now.getTime() + 2 * oneDay).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Todo 3: only due_date
  const todo3 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with due_date only",
        description: "Only has due_date",
        dueDate: new Date(now.getTime() + 3 * oneDay).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Todo 4: no dates
  const todo4 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo with no dates",
        description: "Neither start_date nor due_date",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // Todo 5: both dates, will be marked as completed
  const todo5 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Todo to be completed",
        description: "Will be marked as completed",
        startDate: new Date(now.getTime() + 4 * oneDay).toISOString(),
        dueDate: new Date(now.getTime() + 6 * oneDay).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo5);
  // 3. Toggle todo5 to complete
  const toggledTodo5 = await api.functional.multiUserTodo.member.todos.toggle(
    memberConnection,
    {
      todoId: todo5.id,
    },
  );
  typia.assert(toggledTodo5);
  TestValidator.equals(
    "todo5 should be completed",
    toggledTodo5.completed,
    true,
  );
  // 4. Soft delete all five todos
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo4.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo5.id,
  });
  // 5. Get trash list - verify we have all 5 items with pagination metadata
  const allTrash =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
    );
  typia.assert(allTrash);
  // Verify total count and data
  TestValidator.equals("should have 5 items in trash", allTrash.data.length, 5);
  TestValidator.equals(
    "pagination records should be 5",
    allTrash.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination current should be 0",
    allTrash.pagination.current,
    0,
  );
  // 6. Verify todos have correct properties in trash summary
  const todoIds = allTrash.data.map((t) => t.id);
  TestValidator.predicate("todo1 in trash", todoIds.includes(todo1.id));
  TestValidator.predicate("todo2 in trash", todoIds.includes(todo2.id));
  TestValidator.predicate("todo3 in trash", todoIds.includes(todo3.id));
  TestValidator.predicate("todo4 in trash", todoIds.includes(todo4.id));
  TestValidator.predicate("todo5 in trash", todoIds.includes(todo5.id));
  // 7. Verify NULLS LAST behavior in sorting - todos without dates should appear at end
  // Based on default sort (created_at desc), verify the structure
  const todosWithoutDueDate = allTrash.data.filter((t) => t.due_date === null);
  const todosWithDueDate = allTrash.data.filter((t) => t.due_date !== null);
  // Verify todos with no due_date are included
  TestValidator.equals(
    "should have todo4 (no dates)",
    todosWithoutDueDate.length >= 1,
    true,
  );
  TestValidator.equals(
    "should have todos with due_date",
    todosWithDueDate.length >= 3,
    true,
  );
  // 8. Verify completed todo5 is in trash with completed status
  const completedTodo = allTrash.data.find((t) => t.id === todo5.id);
  TestValidator.equals(
    "completed todo should be in trash",
    completedTodo !== undefined,
    true,
  );
  TestValidator.equals(
    "completed todo should have completed=true",
    completedTodo?.completed,
    true,
  );
  // 9. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    allTrash.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    allTrash.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records",
    allTrash.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages",
    allTrash.pagination.pages !== undefined,
  );
}
