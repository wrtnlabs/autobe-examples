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

export async function test_api_trash_list_with_deleted_todos_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create 5 todos with varying properties
  const now = Date.now();
  const todos = await ArrayUtil.asyncRepeat(5, async (index) => {
    const hasStartDate = index % 2 === 0;
    const hasDueDate = index % 3 === 0;
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Trash Test Todo ${index + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          start_date: hasStartDate
            ? new Date(now + index * 86400000).toISOString()
            : null,
          due_date: hasDueDate
            ? new Date(now + (index + 10) * 86400000).toISOString()
            : null,
        },
      },
    );
    typia.assert(todo);
    return todo;
  });
  // 3. Soft-delete all 5 todos
  for (const todo of todos) {
    await api.functional.todoApp.member.todos.eraseByTodoid(memberConnection, {
      todoId: todo.id,
    });
  }
  // 4. View trash with default pagination (page=1, limit=20)
  const defaultTrash = await api.functional.todoApp.member.trash.index(
    memberConnection,
    { body: {} satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(defaultTrash);
  TestValidator.equals("default trash item count", defaultTrash.data.length, 5);
  TestValidator.equals(
    "default pagination current",
    defaultTrash.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination records",
    defaultTrash.pagination.records,
    5,
  );
  for (const item of defaultTrash.data) {
    TestValidator.predicate(
      "deletedAt is non-null in trash",
      item.deletedAt !== null,
    );
  }
  // 5. View trash with page=1, limit=2 => expect 2 items, records=5, pages=3
  const page1Limit2 = await api.functional.todoApp.member.trash.index(
    memberConnection,
    { body: { page: 1, limit: 2 } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(page1Limit2);
  TestValidator.equals("page1 limit2 data length", page1Limit2.data.length, 2);
  TestValidator.equals(
    "page1 limit2 records",
    page1Limit2.pagination.records,
    5,
  );
  TestValidator.equals("page1 limit2 pages", page1Limit2.pagination.pages, 3);
  // 6. View trash with page=3, limit=2 => expect 1 item (the last one)
  const page3Limit2 = await api.functional.todoApp.member.trash.index(
    memberConnection,
    { body: { page: 3, limit: 2 } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(page3Limit2);
  TestValidator.equals("page3 limit2 data length", page3Limit2.data.length, 1);
  TestValidator.equals(
    "page3 limit2 records",
    page3Limit2.pagination.records,
    5,
  );
  // 7. View trash sorted by createdAt asc => oldest deleted todo first
  const sortedCreatedAsc = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedCreatedAsc);
  TestValidator.equals(
    "sorted createdAt asc count",
    sortedCreatedAsc.data.length,
    5,
  );
  // 8. View trash sorted by startDate asc => todos without startDate at end
  const sortedStartAsc = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        sortBy: "startDate",
        sortOrder: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedStartAsc);
  TestValidator.equals(
    "sorted startDate asc count",
    sortedStartAsc.data.length,
    5,
  );
  // 9. View trash filtered by status=complete => expect only completed todos
  const completeFilter = await api.functional.todoApp.member.trash.index(
    memberConnection,
    { body: { status: "complete" } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(completeFilter);
  // 10. View trash filtered by status=incomplete => expect only incomplete todos
  const incompleteFilter = await api.functional.todoApp.member.trash.index(
    memberConnection,
    { body: { status: "incomplete" } satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(incompleteFilter);
  TestValidator.equals(
    "incomplete + complete sum equals total",
    completeFilter.data.length + incompleteFilter.data.length,
    defaultTrash.pagination.records,
  );
}
