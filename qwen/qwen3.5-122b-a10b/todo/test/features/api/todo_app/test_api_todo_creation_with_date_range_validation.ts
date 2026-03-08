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

/**
 * Test the business rule validation for date range constraints when creating a todo.
 * When a member provides both start date and due date, the system must validate that
 * start date is before or equal to due date. Test scenarios include:
 * (1) valid date range where start date is before due date,
 * (2) valid date range where start date equals due date,
 * (3) invalid date range where start date is after due date (business logic rejection).
 */
export async function test_api_todo_creation_with_date_range_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Test valid date range: start date before due date
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const dueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // day after tomorrow
  const validTodoBefore = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(validTodoBefore);
  TestValidator.equals(
    "start date matches",
    validTodoBefore.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due date matches",
    validTodoBefore.due_date,
    dueDate.toISOString(),
  );
  // 3. Test valid date range: start date equals due date
  const sameDayDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const validTodoSame = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        startDate: sameDayDate.toISOString(),
        dueDate: sameDayDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(validTodoSame);
  TestValidator.equals(
    "start date equals due date",
    validTodoSame.start_date,
    validTodoSame.due_date,
  );
  // 4. Test invalid date range: start date after due date (business logic rejection)
  const invalidStartDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // day after tomorrow
  const invalidDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  await TestValidator.error("invalid date range rejected", async () => {
    await api.functional.todoApp.member.todos.create(memberConnection, {
      body: {
        title: RandomGenerator.name(2),
        startDate: invalidStartDate.toISOString(),
        dueDate: invalidDueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    });
  });
}
