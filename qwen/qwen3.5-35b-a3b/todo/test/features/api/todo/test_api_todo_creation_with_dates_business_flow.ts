import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_creation_with_dates_business_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com",
      referrer: "https://test.example.com/signup",
    },
  });
  typia.assert(memberAuth);
  // 2. Calculate future dates for scheduling
  const now = new Date();
  const startDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
  const dueDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  // 3. Create todo with both start_date and due_date
  const todoWithDates = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoWithDates);
  // 4. Create todo with only start_date (no due_date)
  const todoWithStartDate =
    await api.functional.multiUserTodo.member.todos.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: startDate.toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todoWithStartDate);
  // 5. Create todo with only due_date (no start_date)
  const todoWithDueDate =
    await api.functional.multiUserTodo.member.todos.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        due_date: dueDate.toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todoWithDueDate);
  // 6. Validate todos have correct owner
  TestValidator.equals(
    "todo with dates owner matches member",
    todoWithDates.multi_user_todo_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "todo with start_date owner matches member",
    todoWithStartDate.multi_user_todo_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "todo with due_date owner matches member",
    todoWithDueDate.multi_user_todo_member_id,
    memberAuth.id,
  );
  // 7. Validate date fields are correctly saved
  TestValidator.equals(
    "todo with dates start_date preserved",
    todoWithDates.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "todo with dates due_date preserved",
    todoWithDates.due_date,
    dueDate.toISOString(),
  );
  // 8. Validate todos with dates are non-null
  TestValidator.predicate(
    "todo with dates has non-null start_date",
    todoWithDates.start_date !== null,
  );
  TestValidator.predicate(
    "todo with dates has non-null due_date",
    todoWithDates.due_date !== null,
  );
  // 9. Validate partial date fields work correctly
  TestValidator.predicate(
    "todo with start_date only has non-null start_date",
    todoWithStartDate.start_date !== null,
  );
  TestValidator.equals(
    "todo with start_date only has null due_date",
    todoWithStartDate.due_date,
    null,
  );
  TestValidator.predicate(
    "todo with due_date only has non-null due_date",
    todoWithDueDate.due_date !== null,
  );
  TestValidator.equals(
    "todo with due_date only has null start_date",
    todoWithDueDate.start_date,
    null,
  );
  // 10. Validate completion status and delete flags default to false
  TestValidator.equals(
    "todo with dates is_complete defaults to false",
    todoWithDates.is_complete,
    false,
  );
  TestValidator.equals(
    "todo with dates is_deleted defaults to false",
    todoWithDates.is_deleted,
    false,
  );
  TestValidator.equals(
    "todo with start_date is_complete defaults to false",
    todoWithStartDate.is_complete,
    false,
  );
  TestValidator.equals(
    "todo with due_date is_complete defaults to false",
    todoWithDueDate.is_complete,
    false,
  );
  // 11. Validate timestamps are set
  TestValidator.predicate(
    "todo with dates has valid created_at",
    todoWithDates.created_at !== undefined &&
      todoWithDates.created_at !== null &&
      !Number.isNaN(Date.parse(todoWithDates.created_at)),
  );
  TestValidator.predicate(
    "todo with dates has valid updated_at",
    todoWithDates.updated_at !== undefined &&
      todoWithDates.updated_at !== null &&
      !Number.isNaN(Date.parse(todoWithDates.updated_at)),
  );
}
