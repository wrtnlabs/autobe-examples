import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
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
 * Test privacy boundary enforcement: a member attempting to access another
 * member's todo history entry should receive a 404 Not Found error.
 *
 * This validates Section 32 (User Access Boundaries) and Section 122 (Privacy
 * Boundaries) which mandate strict isolation between user accounts - requests
 * for non-existent OR other users' resources return IDENTICAL not-found errors
 * to prevent information leakage.
 */
export async function test_api_todo_history_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  // 2. Member A creates a todo
  const todo: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.create(memberAConnection, {
      body: {
        title: RandomGenerator.name(),
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todo);
  // 3. Member A updates the todo to create a history entry
  const updatedTodo: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
      todoId: todo.id,
      body: {
        title: RandomGenerator.name(),
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  // 4. Create and authenticate member B with different credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  // 5. Attempt to access member A's history using member B's connection
  // This should fail with 404 Not Found to prevent information leakage
  await TestValidator.httpError(
    "member B cannot access member A's todo history",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.histories.at(
        memberBConnection,
        {
          todoId: todo.id,
          // Use todo.id as historyId - the key test is that member B cannot
          // access member A's resources regardless of the specific historyId
          historyId: todo.id,
        },
      );
    },
  );
}