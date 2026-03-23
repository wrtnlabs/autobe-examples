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
 * Test cross-user isolation for permanent todo deletion from trash.
 * Verifies that member B cannot permanently delete member A's todo,
 * ensuring proper ownership validation and user data isolation.
 */
export async function test_api_todo_permanent_deletion_cross_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      display_name: "Member A",
    },
  });
  typia.assert(memberA);
  // 2. Create a todo item as member A
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "Todo owned by Member A",
      },
    },
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash) as member A
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Authenticate as member B (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      display_name: "Member B",
    },
  });
  typia.assert(memberB);
  // Verify different users
  TestValidator.notEquals("different members", memberA.id, memberB.id);
  // 5. Attempt to permanently delete member A's todo using member B's authentication
  // This should fail with authorization error
  await TestValidator.error(
    "member B cannot permanently delete member A's todo",
    async () => {
      await api.functional.multiUserTodo.member.trash.erase(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
}
