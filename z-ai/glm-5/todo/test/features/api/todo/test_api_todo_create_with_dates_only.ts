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
 * Test creating a todo with title and date fields but without description.
 * This validates the scenario where a user wants to schedule a task without detailed description.
 *
 * Steps:
 * 1. Authenticate as a new member via POST /todoApp/auth/member/join
 * 2. Create a todo by sending a request with:
 *    - title: A task title
 *    - description: null (explicitly omitted or null)
 *    - startDate: A valid datetime
 *    - dueDate: A valid datetime after startDate
 * 3. Verify the response returns a complete todo entity with:
 *    - The exact title as provided
 *    - null for description (explicitly null stored)
 *    - Valid startDate and dueDate values
 *    - completed set to false
 *    - deletedAt set to null
 * 4. Verify date ordering constraint is satisfied (startDate <= dueDate)
 */
export async function test_api_todo_create_with_dates_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare test data with title and dates, but no description
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const startDate = new Date();
  const dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
        description: null,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify the response
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("completed is false", todo.completed, false);
  TestValidator.equals("deletedAt is null", todo.deletedAt, null);
  // 4. Verify date ordering (startDate <= dueDate)
  if (todo.startDate !== null && todo.dueDate !== null) {
    TestValidator.predicate(
      "startDate <= dueDate",
      new Date(todo.startDate) <= new Date(todo.dueDate),
    );
  }
}
