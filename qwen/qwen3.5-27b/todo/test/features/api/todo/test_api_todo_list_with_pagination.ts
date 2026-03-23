import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test the primary success path for listing a member's todo items with pagination.
 *
 * This test verifies that:
 * 1. A member can register and authenticate
 * 2. Multiple todo items can be created for the authenticated member
 * 3. The todo list API returns correctly paginated results
 * 4. Pagination metadata (current, limit, records, pages) is accurate
 * 5. Only the authenticated member's todos are returned
 */
export async function test_api_todo_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Create 5 todo items for testing pagination
  const todos: IMultiUserTodoTodo[] = [];
  for (let i = 0; i < 5; i++) {
    const todo = await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // 3. Request paginated todo list with page=1, limit=3
  const pageRequest = {
    page: 1,
    limit: 3,
  } satisfies IMultiUserTodoTodo.IRequest;
  const response = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    { body: pageRequest },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit per page", response.pagination.limit, 3);
  TestValidator.equals("total records", response.pagination.records, 5);
  TestValidator.equals("total pages", response.pagination.pages, 2);
  // 5. Validate data array contains exactly 3 items
  TestValidator.equals("data array length", response.data.length, 3);
  // 6. Validate each todo belongs to authenticated member (business logic)
  for (const todoSummary of response.data) {
    TestValidator.equals(
      `todo ${todoSummary.id} belongs to member ${memberId}`,
      todoSummary.member.id,
      memberId,
    );
  }
  // 7. Verify all returned todos are from the created set (data isolation)
  const returnedIds = response.data.map((t) => t.id);
  const createdIds = todos.map((t) => t.id);
  for (const returnedId of returnedIds) {
    TestValidator.predicate(
      `returned todo ${returnedId} exists in created set`,
      createdIds.includes(returnedId),
    );
  }
}
