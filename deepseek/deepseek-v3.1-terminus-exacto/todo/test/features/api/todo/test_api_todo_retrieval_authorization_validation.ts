import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test authorization validation by attempting to retrieve a todo owned by a different member.
 * 1. Create two member accounts
 * 2. Create a todo with the first member
 * 3. Authenticate as the second member and attempt to retrieve the first member's todo
 * 4. Validate that the system properly rejects the request with appropriate authorization error
 */
export async function test_api_todo_retrieval_authorization_validation(
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
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Create todo with first member
  const todo = await generate_random_multi_user_todo_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Create second member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(secondMember);
  // 4. Attempt to retrieve first member's todo as second member
  await TestValidator.error(
    "second member cannot retrieve first member's todo",
    async () => {
      await api.functional.multiUserTodo.member.todos.at(
        secondMemberConnection,
        {
          todoId: todo.id satisfies string & tags.Format<"uuid"> as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
  // 5. Verify first member can still retrieve their own todo
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    firstMemberConnection,
    {
      todoId: todo.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
    },
  );
  typia.assert(retrievedTodo);
  TestValidator.equals("todo ids match", retrievedTodo.id, todo.id);
}
