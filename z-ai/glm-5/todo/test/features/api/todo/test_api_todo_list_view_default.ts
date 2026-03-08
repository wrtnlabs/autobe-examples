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

export async function test_api_todo_list_view_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple todos with various configurations
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "First todo - incomplete no dates",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Second todo - incomplete with dates",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Third todo - incomplete start only",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Fourth todo - incomplete due only",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  // 3. Retrieve todo list with default settings (empty body = defaults)
  const todoList = await api.functional.todoApp.member.todos.index(
    memberConnection,
    { body: {} satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(todoList);
  // 4. Validate pagination metadata structure
  TestValidator.predicate("pagination exists", todoList.pagination !== null);
  TestValidator.predicate(
    "pagination.current exists",
    typeof todoList.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination.limit exists",
    typeof todoList.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination.records exists",
    typeof todoList.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination.pages exists",
    typeof todoList.pagination.pages === "number",
  );
  // 5. Validate data structure - each todo summary has required fields
  TestValidator.predicate("data is array", Array.isArray(todoList.data));
  for (const item of todoList.data) {
    typia.assert(item);
  }
  // 6. Validate all created todos are in the list
  TestValidator.predicate("all todos returned", todoList.data.length >= 4);
  const todoIds = todoList.data.map((t) => t.id);
  TestValidator.predicate("todo1 exists", todoIds.includes(todo1.id));
  TestValidator.predicate("todo2 exists", todoIds.includes(todo2.id));
  TestValidator.predicate("todo3 exists", todoIds.includes(todo3.id));
  TestValidator.predicate("todo4 exists", todoIds.includes(todo4.id));
  // 7. Validate default filtering - only active todos (deleted_at is null)
  const allActive = todoList.data.every((t) => t.deleted_at === null);
  TestValidator.predicate("only active todos", allActive);
  // 8. Validate default sorting - created_at descending (newest first)
  for (let i = 0; i < todoList.data.length - 1; i++) {
    const current = new Date(todoList.data[i].created_at).getTime();
    const next = new Date(todoList.data[i + 1].created_at).getTime();
    TestValidator.predicate("sorted descending", current >= next);
  }
  // 9. Verify privacy isolation - create another member and verify their todos are not visible
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {});
  const otherTodo = await generate_random_todo_app_member_todos_create(
    otherMemberConnection,
    { body: { title: "Other member todo" } satisfies ITodoAppTodo.ICreate },
  );
  const memberTodoList = await api.functional.todoApp.member.todos.index(
    memberConnection,
    { body: {} satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(memberTodoList);
  const memberTodoIds = memberTodoList.data.map((t) => t.id);
  TestValidator.predicate(
    "other member todo not visible",
    !memberTodoIds.includes(otherTodo.id),
  );
}
