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

export async function test_api_todo_detail_view_own_active_todo(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_at: startAt,
        due_at: dueAt,
      },
    },
  );
  typia.assert(created);
  const detail = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("todo id should match", detail.id, created.id);
  TestValidator.equals(
    "owner id should match",
    detail.member.id,
    created.member.id,
  );
  TestValidator.equals(
    "owner email should match",
    detail.member.email,
    created.member.email,
  );
  TestValidator.equals("title should match", detail.title, created.title);
  TestValidator.equals(
    "description should match",
    detail.description,
    created.description,
  );
  TestValidator.equals(
    "start_at should match",
    detail.start_at,
    created.start_at,
  );
  TestValidator.equals("due_at should match", detail.due_at, created.due_at);
  TestValidator.equals(
    "completion state should match",
    detail.is_completed,
    created.is_completed,
  );
  TestValidator.equals(
    "created_at should match",
    detail.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    detail.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted_at should match",
    detail.deleted_at,
    created.deleted_at,
  );
  TestValidator.predicate("todo should be active", detail.deleted_at === null);
  TestValidator.predicate(
    "detail should not expose history",
    !("history" in detail),
  );
}
