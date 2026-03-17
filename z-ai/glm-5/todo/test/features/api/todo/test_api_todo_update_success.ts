import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with initial title using utility function
  const initialTitle = "Buy groceries";
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
      },
    },
  );
  typia.assert(todo);
  // 3. Update the todo with new values
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 1 day from now
  const dueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 2 days from now
  const updatedTodo = await api.functional.privateTodoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Buy groceries and cook dinner",
        description: "Need to buy vegetables and meat",
        startDate,
        dueDate,
      } satisfies IPrivateTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate business logic
  TestValidator.equals(
    "title matches",
    updatedTodo.title,
    "Buy groceries and cook dinner",
  );
  TestValidator.equals(
    "description matches",
    updatedTodo.description,
    "Need to buy vegetables and meat",
  );
  TestValidator.equals("start_date matches", updatedTodo.start_date, startDate);
  TestValidator.equals("due_date matches", updatedTodo.due_date, dueDate);
  TestValidator.equals("member matches", updatedTodo.member.id, member.id);
  TestValidator.equals("completed remains false", updatedTodo.completed, false);
  TestValidator.equals("deleted_at remains null", updatedTodo.deleted_at, null);
  TestValidator.predicate(
    "updated_at greater than created_at",
    new Date(updatedTodo.updated_at).getTime() >
      new Date(updatedTodo.created_at).getTime(),
  );
}
