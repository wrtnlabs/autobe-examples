import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import type { IETodoAppTodoFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppTodoFilter";
import type { IETodoAppTodoSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppTodoSort";
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

/**
 * Test todo list retrieval with default pagination parameters.
 *
 * Validates the default pagination behavior of the member todo list endpoint. Tests that a newly authenticated member can retrieve their todo list using default filter (all), default sort (creation_date DESC), and default pagination (page 1, limit 20). Ensures the response structure matches IPageITodoAppTodo.ISummary schema with proper pagination metadata.
 *
 * Special attention is given to verifying that pagination metadata contains all required fields with correct default values, and that the data array structure is valid even when empty (which is expected for a newly registered member with no todos).
 *
 * 1. Register and authenticate a new member using authorize_member_join utility.
 * 2. Retrieve todo list with default parameters (empty request body).
 * 3. Validate response structure matches IPageITodoAppTodo.ISummary schema.
 * 4. Verify pagination metadata has correct default values (current: 1, limit: 20, records: 0, pages: 0).
 * 5. Validate data array is present and properly typed.
 */
export async function test_api_todo_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve todo list with default parameters
  const todoList = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todoList);
  // 3. Validate pagination metadata default values
  TestValidator.equals("current page", todoList.pagination.current, 1);
  TestValidator.equals("default limit", todoList.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    todoList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    todoList.pagination.pages >= 0,
  );
  // 4. Validate data array is present
  TestValidator.predicate("data array exists", Array.isArray(todoList.data));
  // 5. For newly registered member, validate empty todo list
  TestValidator.equals(
    "no todos for new member",
    todoList.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for empty list",
    todoList.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array", todoList.data.length, 0);
}
