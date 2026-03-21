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
 * Test that a member cannot view the edit history of another user's todo.
 *
 * Steps:
 * 1. Register member A via POST /multiUserTodo/auth/member/join
 * 2. Create a todo as member A via POST /multiUserTodo/member/todos
 * 3. Register member B via POST /multiUserTodo/auth/member/join
 * 4. As member B, attempt to retrieve the edit history of member A's todo via PATCH /multiUserTodo/member/todos/{todoId}/history
 *
 * Expected validation:
 * - Response should have HTTP 403 or 404 status (access denied)
 * - The system should not reveal whether the todo exists
 * - Member B should not be able to access any information about member A's todo or its history
 */
export async function test_api_todo_history_other_user_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // Step 2: Create a todo as member A
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  // Step 3: Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 4: As member B, attempt to retrieve the edit history of member A's todo
  // Expected: Should fail with HTTP 403 or 404 (access denied)
  await TestValidator.httpError(
    "member B cannot access member A's todo history",
    [403, 404],
    async () =>
      await api.functional.multiUserTodo.member.todos.history.index(
        memberBConnection,
        {
          todoId: todo.id,
          body: {},
        },
      ),
  );
}
