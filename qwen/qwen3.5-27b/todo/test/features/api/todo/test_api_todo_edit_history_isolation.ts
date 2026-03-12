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
 * Test that members cannot access edit history for another member's todo items.
 *
 * This test validates the critical business rule that users can only view their
 * own data and cannot access other users' edit histories, maintaining strict
 * data isolation between members.
 */
export async function test_api_todo_edit_history_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A and create a todo
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create a todo as Member A
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 2. Authenticate as Member B (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Attempt to access Member A's todo edit history as Member B
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "Member B cannot access Member A's todo edit history",
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.editHistories(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // 4. Verify that Member A can still access their own edit history
  const editHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.editHistories(
      memberAConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(editHistory);
  // Validate that Member A can access their own edit history (even if empty)
  TestValidator.predicate(
    "Member A can access their own edit history",
    editHistory.data !== null && editHistory.data !== undefined,
  );
}
