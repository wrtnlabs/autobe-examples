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

export async function test_api_todo_trash_permanent_delete_not_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - join account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoAppMember.IJoin,
    });
  typia.assert(member);
  // 2. Create todo in active list (not in trash)
  const todo: IMultiUserTodoAppTodo =
    await generate_random_multi_user_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoAppTodo.ICreate,
      },
    );
  typia.assert(todo);
  // Verify todo is in active list (not in trash)
  TestValidator.equals(
    "todo is in active list (not trash)",
    todo.deletedAt,
    null,
  );
  // 3. Attempt to permanently delete todo that is NOT in trash
  // This should fail with business validation error
  await TestValidator.error(
    "permanent delete rejected for todo not in trash",
    async () => {
      await api.functional.multiUserTodoApp.member.todos.trash.erase(
        memberConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}