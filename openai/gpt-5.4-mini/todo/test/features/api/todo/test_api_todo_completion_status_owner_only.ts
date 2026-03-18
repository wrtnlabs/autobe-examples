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

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_completion_status_owner_only(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await api.functional.todoApp.auth.member.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(ownerAuthorized);
  const ownerTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(ownerTodo);
  const originalCompletion = ownerTodo.is_completed;
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await api.functional.todoApp.auth.member.join(
    otherConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(otherAuthorized);
  await TestValidator.error(
    "non-owner cannot update another member's todo completion status",
    async () => {
      await api.functional.todoApp.member.todos.completion_status.updateCompletionStatus(
        otherConnection,
        {
          todoId: ownerTodo.id,
          body: {
            completionStatus: originalCompletion ? "incomplete" : "complete",
          } satisfies ITodoAppTodo.IUpdateCompletionStatus,
        },
      );
    },
  );
  TestValidator.equals(
    "original todo completion state remains unchanged",
    ownerTodo.is_completed,
    originalCompletion,
  );
}
