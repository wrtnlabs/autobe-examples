import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_restore_other_member_todo_blocked(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member cannot restore another member's deleted todo.
   *
   * Validates the private ownership boundary in the todo app by creating a todo
   * under member A, soft-deleting it into trash, and then attempting restoration
   * from member B's session. The scenario ensures that only the owning member
   * can restore a deleted todo and that an unauthorized restore attempt does not
   * move the todo back to the active list.
   *
   * 1. Member A joins the private todo app and creates a todo.
   * 2. Member A deletes the todo so it enters trash.
   * 3. Member B joins the app and attempts to restore member A's deleted todo.
   * 4. Validate that the unauthorized restore attempt is blocked.
   */
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}_${RandomGenerator.alphabets(4)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  await TestValidator.error(
    "restore another member's deleted todo must be blocked",
    async () => {
      await api.functional.todoApp.member.todos.restore.create(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
