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
 * Test the primary logout flow for an authenticated member.
 * The member authenticates via join, performs some operations (create a todo),
 * then terminates their session. Verify that the logout succeeds and the member's
 * access token is revoked. Attempt to access a protected resource after logout
 * to confirm the token is invalidated.
 */
export async function test_api_member_session_termination_after_authenticated_operations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as member
  const member = await authorize_member_join(memberConnection);
  typia.assert(member);
  // 3. Verify authenticated access by creating a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 4. Terminate the session (logout)
  await api.functional.multiUserTodo.member.sessions.terminate(
    memberConnection,
  );
  // 5. Verify token revocation by attempting to access protected resource
  await TestValidator.error(
    "should reject authenticated operation after logout",
    async () => {
      await api.functional.multiUserTodo.member.todos.create(memberConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoTodo.ICreate,
      });
    },
  );
}
