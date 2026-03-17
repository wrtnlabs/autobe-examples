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

export async function test_api_todo_update_missing_or_unavailable_target_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  const baselineTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(baselineTodo);
  const nonexistentTodoId = typia.random<string & tags.Format<"uuid">>();
  const missingTargetBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    completed: true,
  } satisfies ITodoAppTodo.IUpdate;
  await TestValidator.error(
    "rejects update for nonexistent todo target",
    async () => {
      await api.functional.todoApp.member.todos.update(memberConnection, {
        todoId: nonexistentTodoId,
        body: missingTargetBody,
      });
    },
  );
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(otherMemberAuth);
  const foreignTodo = await generate_random_todo_app_member_todos_create(
    otherMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  typia.assert(foreignTodo);
  const foreignTargetBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    completed: false,
  } satisfies ITodoAppTodo.IUpdate;
  await TestValidator.error(
    "rejects update for unavailable foreign-owned todo target",
    async () => {
      await api.functional.todoApp.member.todos.update(memberConnection, {
        todoId: foreignTodo.id,
        body: foreignTargetBody,
      });
    },
  );
  TestValidator.notEquals(
    "baseline todo and foreign todo are distinct resources",
    baselineTodo.id,
    foreignTodo.id,
  );
  TestValidator.equals(
    "baseline todo remains active",
    baselineTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "foreign todo remains active",
    foreignTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "authorized member owns baseline workspace identity only",
    memberAuth.id === otherMemberAuth.id,
    false,
  );
}
