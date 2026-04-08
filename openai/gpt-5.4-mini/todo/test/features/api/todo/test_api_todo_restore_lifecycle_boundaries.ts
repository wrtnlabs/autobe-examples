import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_restore_lifecycle_boundaries(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const restoreCandidate = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(restoreCandidate);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: restoreCandidate.id,
  });
  const restoredTodo = await api.functional.todoApp.member.todos.restore.create(
    memberConnection,
    {
      todoId: restoreCandidate.id,
    },
  );
  typia.assert(restoredTodo);
  TestValidator.equals(
    "restored todo id matches",
    restoredTodo.id,
    restoreCandidate.id,
  );
  TestValidator.equals("restored todo is active", restoredTodo.deletedAt, null);
  const activeTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(activeTodo);
  await TestValidator.httpError(
    "restore rejected for active todo",
    [400, 404, 409],
    async () => {
      await api.functional.todoApp.member.todos.restore.create(
        memberConnection,
        {
          todoId: activeTodo.id,
        },
      );
    },
  );
  const permanentDeleteCandidate =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(permanentDeleteCandidate);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: permanentDeleteCandidate.id,
  });
  await api.functional.todoApp.member.todos.permanent_delete.erase(
    memberConnection,
    {
      todoId: permanentDeleteCandidate.id,
    },
  );
  await TestValidator.httpError(
    "restore rejected after permanent delete",
    [400, 404, 409],
    async () => {
      await api.functional.todoApp.member.todos.restore.create(
        memberConnection,
        {
          todoId: permanentDeleteCandidate.id,
        },
      );
    },
  );
}
