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

export async function test_api_todo_update_detail_fields_with_single_history_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(joined);
  const initialStartDate = new Date(
    "2026-01-10T09:00:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const initialDueDate = new Date(
    "2026-01-12T18:00:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: `initial-title-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        startDate: initialStartDate,
        dueDate: initialDueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const updatedStartDate = new Date(
    "2026-02-01T10:30:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const updatedDueDate = new Date(
    "2026-02-05T20:45:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const updateBody = {
    title: `updated-title-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.content({ paragraphs: 3 }),
    start_date: updatedStartDate,
    due_date: updatedDueDate,
  } satisfies ITodoAppTodo.IUpdate;
  const updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: created.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.notEquals(
    "title actually changes",
    created.title,
    updateBody.title,
  );
  TestValidator.notEquals(
    "description actually changes",
    created.description,
    updateBody.description,
  );
  TestValidator.notEquals(
    "start_date actually changes",
    created.start_date,
    updateBody.start_date,
  );
  TestValidator.notEquals(
    "due_date actually changes",
    created.due_date,
    updateBody.due_date,
  );
  TestValidator.equals("todo id preserved", updated.id, created.id);
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    created.created_at,
  );
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "start_date updated",
    updated.start_date,
    updateBody.start_date,
  );
  TestValidator.equals(
    "due_date updated",
    updated.due_date,
    updateBody.due_date,
  );
  TestValidator.equals(
    "active todo remains not deleted",
    updated.deleted_at,
    null,
  );
  TestValidator.equals("todo remains incomplete", updated.completed, false);
  TestValidator.equals(
    "completed_at stays null for incomplete todo",
    updated.completed_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at changes after edit",
    updated.updated_at,
    created.updated_at,
  );
}
