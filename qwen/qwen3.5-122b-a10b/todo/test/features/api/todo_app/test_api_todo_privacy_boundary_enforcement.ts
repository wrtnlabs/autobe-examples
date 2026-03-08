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
 * Test privacy boundary enforcement - member cannot access another member's todo.
 *
 * This test validates that the todo application properly enforces data isolation
 * between users. When Member B attempts to access Member A's todo, the system
 * returns 404 Not Found without revealing whether the todo exists or belongs
 * to another user, preventing information leakage about other users' data.
 *
 * Test Flow:
 * 1. Member A authenticates via authorize_member_join
 * 2. Member A creates a todo via generate_random_todo_app_member_todos_create
 * 3. Member B authenticates via authorize_member_join (separate account)
 * 4. Member B attempts to retrieve Member A's todo via api.functional.todoApp.member.todos.at
 * 5. System returns 404 Not Found (privacy boundary enforced)
 */
export async function test_api_todo_privacy_boundary_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authenticates and creates a todo
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // Member A creates a todo
  const todoA = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // 2. Member B authenticates (separate account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member B attempts to access Member A's todo (should fail with 404)
  await TestValidator.httpError(
    "member B cannot access member A's todo - privacy boundary enforced",
    404,
    async () => {
      await api.functional.todoApp.member.todos.at(memberBConnection, {
        todoId: todoA.id,
      });
    },
  );
  // 4. Verify Member A can still access their own todo (sanity check)
  const todoAByOwner = await api.functional.todoApp.member.todos.at(
    memberAConnection,
    {
      todoId: todoA.id,
    },
  );
  typia.assert(todoAByOwner);
  TestValidator.equals("todo title matches", todoAByOwner.title, todoA.title);
  TestValidator.equals(
    "todo belongs to member A",
    todoAByOwner.author.id,
    memberA.id,
  );
}
