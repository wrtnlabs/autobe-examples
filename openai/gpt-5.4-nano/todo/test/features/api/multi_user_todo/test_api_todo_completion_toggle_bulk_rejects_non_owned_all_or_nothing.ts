import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_completion_toggle_bulk_rejects_non_owned_all_or_nothing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test bulk completion toggle all-or-nothing behavior across member isolation.
   *
   * Validates that a member cannot toggle completion for another member's todo.
   * The request must be rejected atomically when any todo id in the request is not
   * owned by the authenticated member, and no eligible (owned) todos must be
   * modified.
   *
   * 1. Member A and Member B are authenticated via independent join sessions.
   * 2. Member A creates TodoA, Member B creates TodoB.
   * 3. Member A records TodoA completion state.
   * 4. Member A attempts to toggle both TodoA and TodoB.
   * 5. The bulk toggle must be rejected due to TodoB non-ownership.
   * 6. TodoA completion state must remain unchanged after the rejected request.
   * 7. TodoB completion state must also remain unchanged after the rejected request.
   */
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    { body: undefined },
  );
  typia.assert(todoA);
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    { body: undefined },
  );
  typia.assert(todoB);
  const todoABaseline = await api.functional.multiUserTodo.member.todos.at(
    memberAConnection,
    { todoId: todoA.id },
  );
  typia.assert(todoABaseline);
  const todoBBaseline = await api.functional.multiUserTodo.member.todos.at(
    memberBConnection,
    { todoId: todoB.id },
  );
  typia.assert(todoBBaseline);
  await TestValidator.error(
    "bulk toggle rejects non-owned todo id (atomic rejection)",
    async () => {
      await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
        memberAConnection,
        {
          body: {
            todoIds: [todoA.id, todoB.id],
            page: null,
            limit: null,
          } satisfies IMultiUserTodoTodoEditHistoryEntry.IRequest,
        },
      );
    },
  );
  const todoAAfter = await api.functional.multiUserTodo.member.todos.at(
    memberAConnection,
    { todoId: todoA.id },
  );
  typia.assert(todoAAfter);
  TestValidator.equals(
    "TodoA completion unchanged after rejected bulk toggle",
    todoAAfter.is_complete,
    todoABaseline.is_complete,
  );
  const todoBAfter = await api.functional.multiUserTodo.member.todos.at(
    memberBConnection,
    { todoId: todoB.id },
  );
  typia.assert(todoBAfter);
  TestValidator.equals(
    "TodoB completion unchanged after rejected bulk toggle",
    todoBAfter.is_complete,
    todoBBaseline.is_complete,
  );
}
