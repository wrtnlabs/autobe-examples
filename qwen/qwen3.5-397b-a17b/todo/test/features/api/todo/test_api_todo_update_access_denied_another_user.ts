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
 * Test access control when a member attempts to update another user's todo.
 *
 * Validates that the system properly prevents cross-user todo modifications by denying update requests from non-owners. Two members are created with unique credentials - member A creates a todo, then member B attempts to update member A's todo. The system must reject this unauthorized access attempt with an appropriate HTTP error response (403 Forbidden or 404 Not Found).
 *
 * This test ensures complete data isolation between users, a critical privacy requirement for the todo application. Each user's todos are completely private and cannot be accessed or modified by other users.
 *
 * 1. Member A registers and authenticates with unique credentials.
 * 2. Member A creates a todo with title, description, and optional dates.
 * 3. Member B registers and authenticates with different unique credentials.
 * 4. Member B attempts to update Member A's todo using the todo ID.
 * 5. The system denies the request with 403 Forbidden or 404 Not Found error.
 * 6. Validates that cross-user todo modification is properly prevented.
 */
export async function test_api_todo_update_access_denied_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
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
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Member B registers and authenticates with different credentials
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
  // 4. Member B attempts to update Member A's todo (should fail)
  await TestValidator.httpError(
    "member B cannot update member A's todo",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.todos.update(memberBConnection, {
        todoId: todo.id,
        body: {
          title: "Unauthorized Update Attempt",
          description: "This should fail",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
