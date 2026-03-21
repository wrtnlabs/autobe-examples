import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_creation_with_valid_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare dates - tomorrow at 9:00 AM for startDate, tomorrow at 5:00 PM for dueDate
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const startDate = tomorrow.toISOString();
  tomorrow.setHours(17, 0, 0, 0);
  const dueDate = tomorrow.toISOString();
  // 3. Create todo with valid date range
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Project with dates",
        description: "Testing todo creation with valid date range",
        startDate: startDate,
        dueDate: dueDate,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Validate the created todo
  TestValidator.equals(
    "todo has valid title",
    todo.title,
    "Project with dates",
  );
  TestValidator.equals(
    "todo has description",
    todo.description,
    "Testing todo creation with valid date range",
  );
  // 5. Verify dates are correctly stored and dueDate is after startDate
  TestValidator.equals("dueDate is after startDate", dueDate > startDate, true);
  TestValidator.predicate("start_date is not null", todo.start_date !== null);
  TestValidator.predicate("due_date is not null", todo.due_date !== null);
  if (todo.start_date !== null && todo.due_date !== null) {
    TestValidator.equals(
      "startDate stored correctly",
      new Date(todo.start_date).getTime(),
      new Date(startDate).getTime(),
    );
    TestValidator.equals(
      "dueDate stored correctly",
      new Date(todo.due_date).getTime(),
      new Date(dueDate).getTime(),
    );
    TestValidator.equals(
      "dueDate is after startDate in stored data",
      new Date(todo.due_date) > new Date(todo.start_date),
      true,
    );
  }
}
