import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test cross-user data isolation and security protection.
 *
 * Member A registers and creates a todo. Member B then registers and attempts to
 * retrieve Member A's todo using the todoId. Verifies the system returns HTTP 404
 * (not 403) with an identical 'not found' error as non-existent todos. This validates
 * section 69 (Private Todo Protection) and section 68 (Todo Access Denied for Non-Owners),
 * ensuring no information leakage about existence of other users' data and preventing
 * user enumeration attacks.
 */
export async function test_api_todo_detail_view_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection);
  // Create actor-specific connection for Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection);
  // Member A creates a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {},
    },
  );
  typia.assert(todo);
  // Verify Member B cannot access Member A's todo - should return HTTP 404 (not 403)
  await TestValidator.httpError(
    "cross-user access returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.at(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
  // Verify non-existent todo also returns 404 for error consistency
  await TestValidator.httpError(
    "non-existent todo returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.at(memberBConnection, {
        todoId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
