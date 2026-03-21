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

export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Prepare todo creation data with all fields
  const startDate = new Date();
  const dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const body = {
    title: "Complete project documentation",
    description: "Write comprehensive documentation for all API endpoints",
    startDate: startDate.toISOString(),
    dueDate: dueDate.toISOString(),
  } satisfies IMultiUserTodoTodo.ICreate;
  // 3. Create todo with all fields
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body,
    },
  );
  // 4. Validate response with typia.assert
  typia.assert(todo);
  // 5. Additional business logic validations
  TestValidator.equals("title matches", todo.title, body.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    body.description,
  );
  TestValidator.equals("start_date matches", todo.start_date, body.startDate);
  TestValidator.equals("due_date matches", todo.due_date, body.dueDate);
  TestValidator.equals("completed is false", todo.completed, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  TestValidator.equals("editHistories_count is 0", todo.editHistories_count, 0);
  TestValidator.equals("editHistories is empty", todo.editHistories.length, 0);
  TestValidator.predicate(
    "member is present",
    todo.member !== null && todo.member !== undefined,
  );
}
