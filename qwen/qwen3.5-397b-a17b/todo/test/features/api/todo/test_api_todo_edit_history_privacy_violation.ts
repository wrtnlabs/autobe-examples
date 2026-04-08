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
 * Test that a user cannot access edit history entries for another user's todo, enforcing complete privacy isolation.
 *
 * Validates the privacy boundary enforcement for todo edit history access. Ensures that users can only access edit history for todos they own, and that the system properly denies cross-user access attempts without leaking information about other users' data.
 *
 * The test creates two separate user accounts (member A and member B) with isolated authentication sessions. Member A creates a todo and edits it to generate an edit history entry. Member B then attempts to access member A's edit history using the captured todoId and historyId. The system must reject this request with a 404 Not Found response, demonstrating that privacy boundaries are enforced at the API level.
 *
 * 1. Member A registers and authenticates via /todoApp/auth/member/join.
 * 2. Member A creates a todo with randomized data via POST /todoApp/member/todos.
 * 3. Member A edits the todo via PUT /todoApp/member/todos/{todoId} to generate a history entry.
 * 4. Captures the todoId and the first history entry's historyId from the updated todo response.
 * 5. Member B registers and authenticates via /todoApp/auth/member/join with different credentials.
 * 6. Member B attempts to access member A's edit history via GET /todoApp/member/todos/{todoId}/edit-histories/{historyId}.
 * 7. Validates that the system returns 404 Not Found without leaking any information about member A's data.
 */
export async function test_api_todo_edit_history_privacy_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A and create authenticated connection
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
  // 2. Member A creates a todo
  const todoA = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // 3. Member A edits the todo to generate a history entry
  const updatedTodoA = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoA.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodoA);
  // 4. Capture todoId and historyId from member A's operations
  const todoId = todoA.id;
  const historyId = updatedTodoA.editHistories[0].id;
  // 5. Register member B with different credentials
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
  // 6-7. Member B attempts to access member A's edit history - should return 404
  await TestValidator.error(
    "member B cannot access member A's edit history",
    async () => {
      await api.functional.todoApp.member.todos.edit_histories.at(
        memberBConnection,
        {
          todoId: todoId,
          historyId: historyId,
        },
      );
    },
  );
}
