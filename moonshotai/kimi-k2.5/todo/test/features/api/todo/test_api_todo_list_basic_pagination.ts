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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // Step 2: Retrieve paginated todo list for the authenticated member
  const todoList = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todoList);
  // Step 3: Verify response structure and pagination for empty list (new member has no todos)
  TestValidator.equals(
    "todo data should be empty array for new member",
    todoList.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for new member",
    todoList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for new member",
    todoList.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination current should be non-negative",
    todoList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    todoList.pagination.limit > 0,
  );
}
