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

export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test todo update by owner.
   * 1. Register and authenticate as member
   * 2. Create a todo item
   * 3. Update the todo with modified fields
   * 4. Validate the updated todo response
   */
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a todo item with initial data
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialStartDate = new Date().toISOString();
  const initialDueDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days later
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        start_date: initialStartDate,
        due_date: initialDueDate,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Update the todo with modified fields
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedStartDate = new Date(Date.now() + 86400000).toISOString(); // 1 day later
  const updatedDueDate = new Date(Date.now() + 86400000 * 14).toISOString(); // 14 days later
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        start_date: updatedStartDate,
        due_date: updatedDueDate,
        completed: true,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate the updated todo response
  TestValidator.equals("todo id unchanged", updatedTodo.id, todo.id);
  TestValidator.equals("title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    updatedStartDate,
  );
  TestValidator.equals(
    "due_date updated",
    updatedTodo.due_date,
    updatedDueDate,
  );
  TestValidator.equals("completed status updated", updatedTodo.completed, true);
  TestValidator.equals(
    "member id matches",
    updatedTodo.member.id,
    todo.member.id,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedTodo.updated_at !== todo.updated_at,
  );
  TestValidator.predicate("todo is not deleted", updatedTodo.deleted === false);
  TestValidator.equals("deleted_at is null", updatedTodo.deleted_at, null);
}
