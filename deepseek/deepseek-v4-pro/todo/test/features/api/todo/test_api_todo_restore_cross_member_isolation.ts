import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that user isolation is strictly enforced: one member cannot restore another member's soft-deleted todo.
 *
 * Validates the cross-member access control for the trash restore operation. The system must treat another member's todo as non-existent from the perspective of a different authenticated member, returning a 404 response even when the correct todoId is provided. This ensures that privacy isolation rules are properly enforced at the API level.
 *
 * The test also verifies that the original owner retains full access to their own data after the rejected cross-member attempt, confirming that the rejection does not affect the todo's state in any way.
 *
 * 1. Member A joins, creates a todo, and soft-deletes it to move it to member A's trash.
 * 2. Member B joins as a completely separate, independently authenticated member.
 * 3. Member B attempts to restore member A's soft-deleted todo using member A's todoId.
 * 4. The restore attempt is rejected with a 404 not-found response — the todo is invisible to member B.
 * 5. Member A successfully restores their own todo from trash, confirming data remains intact.
 */
export async function test_api_todo_restore_cross_member_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a todo
  const todoA = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA);
  // 3. Member A soft-deletes the todo
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA.id,
  });
  // 4. Member B authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. Member B attempts to restore member A's todo — must fail with 404
  await TestValidator.httpError(
    "Member B cannot restore Member A's soft-deleted todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.trash.restore(
        memberBConnection,
        { todoId: todoA.id },
      );
    },
  );
  // 6. Member A can still restore their own todo
  const restored = await api.functional.todoApp.member.todos.trash.restore(
    memberAConnection,
    { todoId: todoA.id },
  );
  typia.assert(restored);
  TestValidator.equals("restored todo id matches", restored.id, todoA.id);
}
