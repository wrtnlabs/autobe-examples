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

export async function test_api_todo_update_date_ordering_business_rule(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create todo with initial valid dates (start_date before due_date)
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const dueDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // day after
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "initial start_date matches",
    todo.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "initial due_date matches",
    todo.due_date,
    dueDate.toISOString(),
  );
  // 3. Test invalid date ordering: due_date before start_date
  await TestValidator.error(
    "due_date before start_date should be rejected",
    async () => {
      await api.functional.todoApp.member.todos.update(memberConnection, {
        todoId: todo.id,
        body: {
          start_date: new Date(
            now.getTime() + 48 * 60 * 60 * 1000,
          ).toISOString(), // 2 days later
          due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 1 day later
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // 4. Test valid scenario: update only start_date (with due_date unchanged)
  const newStartDate = new Date(dueDate.getTime() - 12 * 60 * 60 * 1000); // 12 hours before due date
  const updatedStartOnly = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        start_date: newStartDate.toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedStartOnly);
  TestValidator.equals(
    "start_date updated",
    updatedStartOnly.start_date,
    newStartDate.toISOString(),
  );
  TestValidator.equals(
    "due_date unchanged",
    updatedStartOnly.due_date,
    dueDate.toISOString(),
  );
  // 5. Test valid scenario: update only due_date (with start_date unchanged)
  const newDueDate = new Date(newStartDate.getTime() + 48 * 60 * 60 * 1000); // 2 days after start date
  const updatedDueOnly = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        due_date: newDueDate.toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedDueOnly);
  TestValidator.equals(
    "start_date unchanged",
    updatedDueOnly.start_date,
    newStartDate.toISOString(),
  );
  TestValidator.equals(
    "due_date updated",
    updatedDueOnly.due_date,
    newDueDate.toISOString(),
  );
  // 6. Test valid scenario: clear both dates
  const clearedDates = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(clearedDates);
  TestValidator.equals("start_date cleared", clearedDates.start_date, null);
  TestValidator.equals("due_date cleared", clearedDates.due_date, null);
}
