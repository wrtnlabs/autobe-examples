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

export async function test_api_todo_creation_title_and_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Member A: join/register
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ---------- Scenario 1: title only ----------
  const titleA = RandomGenerator.name();
  const todoA1 = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: titleA,
        // omit optional fields
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA1);
  TestValidator.equals("todo title matches", todoA1.title, titleA);
  TestValidator.equals("todo description null", todoA1.description, null);
  TestValidator.equals("todo start_date null", todoA1.start_date, null);
  TestValidator.equals("todo due_date null", todoA1.due_date, null);
  TestValidator.equals(
    "todo completion_status false",
    todoA1.completion_status,
    false,
  );
  TestValidator.equals(
    "todo deleted_in_trash_at null",
    todoA1.deleted_in_trash_at,
    null,
  );
  TestValidator.equals("todo deleted_at null", todoA1.deleted_at, null);
  // ---------- Scenario 2: with optional fields ----------
  const titleA2 = RandomGenerator.name();
  const descriptionA2 = RandomGenerator.paragraph({ sentences: 2 });
  const startDateA2 = new Date().toISOString();
  const dueDateA2 = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const todoA2 = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: titleA2,
        description: descriptionA2,
        start_date: startDateA2,
        due_date: dueDateA2,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA2);
  TestValidator.equals("todo2 title matches", todoA2.title, titleA2);
  TestValidator.equals(
    "todo2 description matches",
    todoA2.description,
    descriptionA2,
  );
  TestValidator.equals(
    "todo2 start_date matches",
    todoA2.start_date,
    startDateA2,
  );
  TestValidator.equals("todo2 due_date matches", todoA2.due_date, dueDateA2);
  TestValidator.equals(
    "todo2 completion_status false",
    todoA2.completion_status,
    false,
  );
  TestValidator.equals(
    "todo2 deleted_in_trash_at null",
    todoA2.deleted_in_trash_at,
    null,
  );
  TestValidator.equals("todo2 deleted_at null", todoA2.deleted_at, null);
  // ---------- Scenario 3: ownership scoping ----------
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const titleB = RandomGenerator.name();
  const todoB1 = await api.functional.todoApp.member.todos.create(
    memberBConnection,
    {
      body: {
        title: titleB,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB1);
  TestValidator.notEquals(
    "todo ids differ between members",
    todoA1.id,
    todoB1.id,
  );
  TestValidator.equals(
    "memberB todo title matches input",
    todoB1.title,
    titleB,
  );
  TestValidator.equals(
    "memberB todo description null",
    todoB1.description,
    null,
  );
  TestValidator.equals(
    "memberB todo completion_status false",
    todoB1.completion_status,
    false,
  );
  TestValidator.equals(
    "memberB todo deleted_in_trash_at null",
    todoB1.deleted_in_trash_at,
    null,
  );
  TestValidator.equals("memberB todo deleted_at null", todoB1.deleted_at, null);
}
