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

export async function test_api_todo_update_completion_toggle_without_detail_history(
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
  const startDate = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const dueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    startDate,
    dueDate,
  } satisfies ITodoAppTodo.ICreate;
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "created title matches input",
    created.title,
    createBody.title,
  );
  TestValidator.equals(
    "created description matches input",
    created.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created start_date matches input",
    created.start_date,
    createBody.startDate ?? null,
  );
  TestValidator.equals(
    "created due_date matches input",
    created.due_date,
    createBody.dueDate ?? null,
  );
  TestValidator.equals(
    "created todo starts incomplete",
    created.completed,
    false,
  );
  TestValidator.equals(
    "created todo has null completed_at",
    created.completed_at,
    null,
  );
  const completedTrue = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: created.id,
      body: {
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(completedTrue);
  TestValidator.equals(
    "toggle to complete sets completed true",
    completedTrue.completed,
    true,
  );
  TestValidator.predicate(
    "toggle to complete sets completed_at",
    completedTrue.completed_at !== null,
  );
  TestValidator.equals(
    "toggle to complete preserves title",
    completedTrue.title,
    created.title,
  );
  TestValidator.equals(
    "toggle to complete preserves description",
    completedTrue.description,
    created.description,
  );
  TestValidator.equals(
    "toggle to complete preserves start_date",
    completedTrue.start_date,
    created.start_date,
  );
  TestValidator.equals(
    "toggle to complete preserves due_date",
    completedTrue.due_date,
    created.due_date,
  );
  const completedFalse = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: created.id,
      body: {
        completed: false,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(completedFalse);
  TestValidator.equals(
    "toggle to incomplete sets completed false",
    completedFalse.completed,
    false,
  );
  TestValidator.equals(
    "toggle to incomplete clears completed_at",
    completedFalse.completed_at,
    null,
  );
  TestValidator.equals(
    "toggle to incomplete preserves title",
    completedFalse.title,
    created.title,
  );
  TestValidator.equals(
    "toggle to incomplete preserves description",
    completedFalse.description,
    created.description,
  );
  TestValidator.equals(
    "toggle to incomplete preserves start_date",
    completedFalse.start_date,
    created.start_date,
  );
  TestValidator.equals(
    "toggle to incomplete preserves due_date",
    completedFalse.due_date,
    created.due_date,
  );
  const completedTrueAgain = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: created.id,
      body: {
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(completedTrueAgain);
  TestValidator.equals(
    "repeated toggle back to complete sets completed true",
    completedTrueAgain.completed,
    true,
  );
  TestValidator.predicate(
    "repeated toggle back to complete sets completed_at",
    completedTrueAgain.completed_at !== null,
  );
  TestValidator.equals(
    "repeated toggle preserves title",
    completedTrueAgain.title,
    created.title,
  );
  TestValidator.equals(
    "repeated toggle preserves description",
    completedTrueAgain.description,
    created.description,
  );
  TestValidator.equals(
    "repeated toggle preserves start_date",
    completedTrueAgain.start_date,
    created.start_date,
  );
  TestValidator.equals(
    "repeated toggle preserves due_date",
    completedTrueAgain.due_date,
    created.due_date,
  );
}
