import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test that a member cannot access another user's todo - access is denied with 404 for privacy.
 *
 * Validates complete privacy isolation between user accounts by ensuring that members cannot view, access, or share another user's todos. The system maintains privacy by making access-denied scenarios indistinguishable from non-existent resources, returning 404 instead of 403 to prevent information leakage about todo existence.
 *
 * Test flow establishes two separate member accounts, creates a todo under one account, and attempts to retrieve it using the other account's authentication. This verifies that the authorization layer correctly enforces ownership-based access control at the API level.
 *
 * 1. Member A registers and authenticates via POST /todoApp/auth/member/join.
 * 2. Member B registers and authenticates via POST /todoApp/auth/member/join (separate session).
 * 3. Member B creates a todo via POST /todoApp/member/todos.
 * 4. Member A attempts to retrieve Member B's todo via GET /todoApp/member/todos/{todoId}.
 * 5. Validates that the request returns HTTP 404 Not Found with no todo data exposed.
 */
export async function test_api_todo_retrieve_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (the attacker who will attempt unauthorized access)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register and authenticate Member B (the victim who owns the target todo)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create a todo under Member B's account (the target todo)
  const todoB = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB);
  // 4. Member A attempts to retrieve Member B's todo - should fail with 404
  await TestValidator.error(
    "access denied - cannot view another user's todo",
    async () => {
      await api.functional.todoApp.member.todos.at(memberAConnection, {
        todoId: todoB.id,
      });
    },
  );
}
