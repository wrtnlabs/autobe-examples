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
 * Test cross-user access control for todo retrieval.
 *
 * Validates that strict data isolation is enforced between member accounts when retrieving todo items. The system must deny access to todos belonging to other users and treat them as non-existent to protect member privacy.
 *
 * This test ensures that the access control mechanism correctly prevents members from accessing another member's todo items, even when they know the todo's UUID. The system should return 404 Not Found rather than 403 Forbidden, following the principle of not revealing the existence of resources that belong to other users.
 *
 * 1. Create first member account with unique credentials.
 * 2. Create second member account with different unique credentials.
 * 3. First member creates a todo item with title and optional description.
 * 4. Second member attempts to retrieve the todo using the todo ID.
 * 5. Validate that the request fails with 404 Not Found error.
 */
export async function test_api_todo_access_control_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstMember);
  // 2. Create second member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondMember);
  // 3. First member creates a todo
  const todo = await api.functional.todoApp.member.todos.create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(todo);
  // 4. Second member attempts to retrieve the todo (should fail)
  await TestValidator.httpError(
    "second member cannot access first member's todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.at(secondMemberConnection, {
        todoId: todo.id,
      });
    },
  );
}
