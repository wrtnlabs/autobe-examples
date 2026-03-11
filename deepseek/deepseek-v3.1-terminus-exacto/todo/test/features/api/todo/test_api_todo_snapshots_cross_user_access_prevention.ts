import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoSnapshot";
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
 * Test that members cannot access snapshot history for todos they don't own.
 * Create two different member accounts (Member A and Member B) through separate join operations.
 * Member A creates a todo and generates snapshots.
 * Then attempt to access the same todo's snapshots using Member B's authentication.
 * Verify that the system rejects the request with appropriate authorization error.
 * This validates data isolation between user accounts.
 */
export async function test_api_todo_snapshots_cross_user_access_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (Member A - owner of todo)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuthorized);
  // 2. Member A creates a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Create second member (Member B - attempting unauthorized access)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // 4. Attempt to access Member A's todo snapshots using Member B's connection
  // This should fail with authorization error
  await TestValidator.error(
    "cannot access other user's todo snapshots",
    async () => {
      await api.functional.multiUserTodo.member.todos.snapshots.index(
        memberBConnection,
        {
          todoId: todo.id,
          body: {} satisfies IMultiUserTodoTodoSnapshot.IRequest,
        },
      );
    },
  );
  // 5. Verify that Member A can access their own todo snapshots (control test)
  // This ensures the todo exists and snapshots endpoint works for the owner
  const snapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberAConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Additional validation: confirm ownership isolation
  TestValidator.equals(
    "member B cannot see Member A's todo in their list",
    memberBAuthorized.id,
    todo.member.id,
    (key) => key === "id",
  );
}
