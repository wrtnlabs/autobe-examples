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
 * Test privacy isolation enforcement in the todo application.
 * Verifies that members cannot access todos belonging to other members,
 * and the system returns 404 (not 403) to prevent todo ID enumeration attacks.
 */
export async function test_api_todo_privacy_isolation_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member who will own the target todo
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // Step 2: Create a todo owned by the first member
  const todo = await generate_random_todo_app_member_todos_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // Step 3: Create second member who will attempt unauthorized access
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // Step 4: Verify member2 cannot access member1's todo
  // Using 404 (not 403) prevents enumeration of valid todo IDs
  await TestValidator.httpError(
    "should return 404 when accessing another member's todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.at(member2Connection, {
        todoId: todo.id,
      });
    },
  );
  // Step 5: Verify member1 can still access their own todo (control test)
  const ownTodo = await api.functional.todoApp.member.todos.at(
    member1Connection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(ownTodo);
  TestValidator.equals("owner can access their own todo", ownTodo.id, todo.id);
}
