import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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

export async function test_api_todo_update_date_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first user (member1)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Session = await api.functional.todoApp.auth.member.join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(member1Session);
  // 2. Create a todo with valid dates
  const validTodo = await api.functional.todoApp.member.todos.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(),
        start_date: new Date().toISOString(),
        due_date: new Date(new Date().getTime() + 86400000 * 7).toISOString(), // 7 days later
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(validTodo);
  // 3. Update with invalid date combination (start_date > due_date)
  const invalidUpdateBody: ITodoAppTodo.IUpdate = {
    start_date: new Date(new Date().getTime() + 86400000 * 14).toISOString(), // 14 days from now
    due_date: new Date().toISOString(), // now (earlier than start_date)
  };
  // This should fail with date validation error
  try {
    await api.functional.todoApp.member.todos.update(member1Connection, {
      todoId: validTodo.id,
      body: invalidUpdateBody,
    });
    throw new Error("Expected date validation to fail but it succeeded");
  } catch (error: any) {
    TestValidator.predicate(
      "date validation error",
      (error as any).status === 400 || (error as any).status === 422,
    );
  }
  // 4. Update with corrected dates (valid: start_date < due_date)
  const validUpdateBody: ITodoAppTodo.IUpdate = {
    start_date: new Date().toISOString(),
    due_date: new Date(new Date().getTime() + 86400000 * 14).toISOString(), // 14 days later
  };
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    member1Connection,
    {
      todoId: validTodo.id,
      body: validUpdateBody,
    },
  );
  typia.assert(updatedTodo);
  // 5. Verify dates were updated correctly
  TestValidator.equals(
    "start_date updated correctly",
    updatedTodo.start_date,
    validUpdateBody.start_date,
  );
  TestValidator.equals(
    "due_date updated correctly",
    updatedTodo.due_date,
    validUpdateBody.due_date,
  );
  // 6. Update with null dates (should be allowed)
  const nullDateUpdateBody: ITodoAppTodo.IUpdate = {
    start_date: null,
    due_date: null,
  };
  const nullDateTodo = await api.functional.todoApp.member.todos.update(
    member1Connection,
    {
      todoId: validTodo.id,
      body: nullDateUpdateBody,
    },
  );
  typia.assert(nullDateTodo);
  // 7. Verify null dates were accepted
  TestValidator.equals("start_date is null", nullDateTodo.start_date, null);
  TestValidator.equals("due_date is null", nullDateTodo.due_date, null);
}
