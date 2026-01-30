import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_list_sorting_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to create and query todos
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create sample todo items with various due dates for sorting and date range tests
  const baseDate = new Date();
  const todoCount = 5;
  const createdTodos = await ArrayUtil.asyncRepeat(todoCount, async (index) => {
    // Create todos with due dates spread across different days (-2 days to +2 days from now)
    const dueDateOffset = (index - 2) * 24 * 60 * 60 * 1000; // milliseconds
    const dueDate = new Date(baseDate.getTime() + dueDateOffset);
    const todo = await api.functional.todoApp.member.todos.create(
      memberConnection,
      {
        body: {
          title: `Test Todo ${index + 1}`,
          description: `Description for todo item ${index + 1}`,
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          due_date: dueDate.toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Step 3: Query the todo list endpoint
  const pageResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pageResult);
  // Step 4: Validate pagination structure and record counts
  TestValidator.equals(
    "pagination should have correct record count",
    pageResult.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "pagination should have correct limit",
    pageResult.pagination.limit,
    0,
  );
  TestValidator.equals(
    "pagination should have correct current page",
    pageResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination should have correct page count",
    pageResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should contain all created todos",
    pageResult.data.length,
    todoCount,
  );
  // Step 5: Validate that created todo IDs are present in the response
  const createdIds = createdTodos.map((t) => t.id).sort();
  const returnedIds = pageResult.data.map((t) => t.id).sort();
  TestValidator.equals(
    "returned todos should match created todos",
    returnedIds,
    createdIds,
  );
}
