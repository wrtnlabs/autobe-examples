import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoHistory";
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
 * Test that a member cannot access another member's todo edit history.
 *
 * 1. Member A creates a todo
 * 2. Member B attempts to retrieve Member A's todo history
 * 3. System should reject with access denied error
 */
export async function test_api_todo_history_access_denied_for_other_member(
  connection: api.IConnection,
) {
  // 1. Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    },
  });
  // 2. Member A creates a todo
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {},
      },
    );
  typia.assert(todo);
  // 3. Create and authenticate Member B with different credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    },
  });
  // 4. Member B attempts to access Member A's todo history
  // This should fail with access denied error
  await TestValidator.error(
    "access denied for non-owner member accessing todo history",
    async () => {
      await api.functional.multiUserTodo.member.todos.histories.index(
        memberBConnection,
        {
          todoId: todo.id,
          body: {} satisfies IMultiUserTodoHistory.IRequest,
        },
      );
    },
  );
}