import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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

export async function test_api_edit_history_retrieve_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo with all fields populated
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const initialStartDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const initialDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        start_date: initialStartDate,
        due_date: initialDueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Edit all fields to new values — this triggers creation of edit history
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.paragraph({ sentences: 6 });
  const newStartDate = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const newDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify all fields were updated correctly in the response
  TestValidator.equals("title updated", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    newStartDate,
  );
  TestValidator.equals("due_date updated", updatedTodo.due_date, newDueDate);
  TestValidator.notEquals(
    "title differs from initial",
    updatedTodo.title,
    initialTitle,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTodo.updated_at,
    todo.updated_at,
  );
}
