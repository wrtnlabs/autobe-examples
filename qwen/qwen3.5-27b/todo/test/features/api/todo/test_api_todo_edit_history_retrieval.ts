import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
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
 * Test that an authenticated member can successfully retrieve the edit history for their own todo item.
 * This test validates the edit history retrieval endpoint by:
 * 1. Authenticating as a member user
 * 2. Creating a new todo item
 * 3. Retrieving the edit history (will be empty since no update API is available)
 * 4. Verifying the response structure and pagination
 */
export async function test_api_todo_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a new todo item with title and description
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the edit history for the todo
  // Note: History will be empty since no updates were performed
  // (update endpoint not available in provided SDK)
  const history =
    await api.functional.multiUserTodo.member.todos.edit_histories.editHistories(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(history);
  // 4. Verify pagination structure
  TestValidator.predicate(
    "pagination has current page",
    () => history.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => history.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => history.pagination.pages >= 0,
  );
  // 5. Verify that history data is an array
  TestValidator.predicate("history data is an array", () =>
    Array.isArray(history.data),
  );
  // 6. Verify each entry (if any) contains required fields
  for (const entry of history.data) {
    TestValidator.predicate(
      `entry ${entry.id} has edit_timestamp`,
      () => entry.edit_timestamp !== undefined,
    );
    TestValidator.predicate(
      `entry ${entry.id} has field_name`,
      () => entry.field_name !== undefined && entry.field_name.length > 0,
    );
    TestValidator.predicate(
      `entry ${entry.id} has new_value`,
      () => entry.new_value !== undefined,
    );
    // old_value can be null for first-time field sets
  }
  // 7. Verify that history is empty (since no updates were performed)
  TestValidator.equals(
    "edit history is empty for newly created todo",
    history.data.length,
    0,
  );
  // 8. Verify pagination records matches data length
  TestValidator.equals(
    "pagination records matches data length",
    history.pagination.records,
    history.data.length,
  );
}
