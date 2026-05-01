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
 * Test cross-member privacy isolation when retrieving a todo by its ID.
 *
 * Validates that a member cannot access another member's todo through the detail
 * endpoint. The system must return a not-found error without revealing the
 * existence of the todo — this ensures strict privacy isolation between
 * members. Each member's todos are completely invisible to all other members.
 *
 * 1. Member A registers and authenticates via the join utility.
 * 2. Member A creates a new todo with random data.
 * 3. Member B registers and authenticates as a different member.
 * 4. Member B attempts to retrieve Member A's todo by its ID.
 * 5. The request fails with an error — Member B must not see Member A's todo.
 */
export async function test_api_todo_detail_cross_member_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todoA = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA);
  // 3. Member B joins and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4-5. Member B attempts to retrieve Member A's todo — must fail
  await TestValidator.error(
    "cross-member todo access must be rejected",
    async () => {
      await api.functional.todoApp.member.todos.at(memberBConnection, {
        todoId: todoA.id,
      });
    },
  );
}
