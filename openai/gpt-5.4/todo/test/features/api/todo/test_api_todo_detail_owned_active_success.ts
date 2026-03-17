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

export async function test_api_todo_detail_owned_active_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    startDate: typia.random<string & tags.Format<"date-time">>(),
    dueDate: typia.random<string & tags.Format<"date-time">>(),
  } satisfies ITodoAppTodo.ICreate;
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(created);
  const detailed = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: created.id,
    },
  );
  typia.assert(detailed);
  TestValidator.equals("todo id matches", detailed.id, created.id);
  TestValidator.equals("todo title matches", detailed.title, created.title);
  TestValidator.equals(
    "todo description matches",
    detailed.description,
    created.description,
  );
  TestValidator.equals(
    "todo start date matches",
    detailed.start_date,
    created.start_date,
  );
  TestValidator.equals(
    "todo due date matches",
    detailed.due_date,
    created.due_date,
  );
  TestValidator.equals(
    "todo completed flag matches",
    detailed.completed,
    created.completed,
  );
  TestValidator.equals(
    "todo completed_at matches",
    detailed.completed_at,
    created.completed_at,
  );
  TestValidator.equals(
    "todo created_at matches",
    detailed.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "todo updated_at matches",
    detailed.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "todo deleted_at matches",
    detailed.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals("todo is active", detailed.deleted_at, null);
  TestValidator.equals("todo is incomplete", detailed.completed, false);
  TestValidator.equals(
    "todo completion timestamp absent",
    detailed.completed_at,
    null,
  );
}
