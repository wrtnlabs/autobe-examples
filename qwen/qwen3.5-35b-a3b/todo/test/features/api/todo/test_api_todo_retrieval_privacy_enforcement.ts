import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

/**
 * Test privacy and ownership enforcement for todo retrieval.
 * Validates that users cannot access other users' todos, even with valid IDs.
 * Returns 404 (not found) rather than 403 (forbidden) to maintain privacy.
 */
export async function test_api_todo_retrieval_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member 1 and their todo
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member1);
  const todo1 = await api.functional.multiUserTodoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // 2. Create Member 2 and their todo
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member2);
  const todo2 = await api.functional.multiUserTodoApp.member.todos.create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // 3. Test privacy: Member 2 tries to access Member 1's todo
  // Should return 404 (not found), not 403 (forbidden)
  await TestValidator.error(
    "cannot access another user's todo (privacy enforcement)",
    async () => {
      await api.functional.multiUserTodoApp.member.todos.at(member2Connection, {
        todoId: todo1.id,
      });
    },
  );
}
