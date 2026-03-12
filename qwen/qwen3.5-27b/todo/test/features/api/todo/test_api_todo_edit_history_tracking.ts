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

export async function test_api_todo_edit_history_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a todo with initial values
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialStartDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const initialDueDate = new Date(Date.now() + 172800000).toISOString(); // day after tomorrow
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
  TestValidator.equals("initial todo title", todo.title, initialTitle);
  TestValidator.equals(
    "initial description",
    todo.description,
    initialDescription,
  );
  TestValidator.equals("initial start_date", todo.start_date, initialStartDate);
  TestValidator.equals("initial due_date", todo.due_date, initialDueDate);
  TestValidator.predicate(
    "initial completed is false",
    todo.completed === false,
  );
  // 3. Update multiple fields (title and description) - should create history entries
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTodo1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        description: newDescription,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  TestValidator.equals("title updated", updatedTodo1.title, newTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo1.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo1.start_date,
    initialStartDate,
  );
  TestValidator.equals(
    "due_date unchanged",
    updatedTodo1.due_date,
    initialDueDate,
  );
  TestValidator.predicate(
    "completed still false",
    updatedTodo1.completed === false,
  );
  // 4. Update only completed status - should NOT create edit history entry
  const updatedTodo2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        completed: true,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  TestValidator.predicate(
    "completed status changed to true",
    updatedTodo2.completed === true,
  );
  TestValidator.equals("title unchanged", updatedTodo2.title, newTitle);
  TestValidator.equals(
    "description unchanged",
    updatedTodo2.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo2.start_date,
    initialStartDate,
  );
  TestValidator.equals(
    "due_date unchanged",
    updatedTodo2.due_date,
    initialDueDate,
  );
  // 5. Update start_date separately - should create history entry
  const newStartDate = new Date(Date.now() + 259200000).toISOString(); // 3 days from now
  const updatedTodo3 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        start_date: newStartDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo3);
  TestValidator.equals(
    "start_date updated",
    updatedTodo3.start_date,
    newStartDate,
  );
  TestValidator.equals(
    "due_date unchanged",
    updatedTodo3.due_date,
    initialDueDate,
  );
  TestValidator.predicate(
    "completed still true",
    updatedTodo3.completed === true,
  );
  // 6. Update due_date separately - should create history entry
  const newDueDate = new Date(Date.now() + 345600000).toISOString(); // 4 days from now
  const updatedTodo4 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        due_date: newDueDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo4);
  TestValidator.equals("due_date updated", updatedTodo4.due_date, newDueDate);
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo4.start_date,
    newStartDate,
  );
  TestValidator.predicate(
    "completed still true",
    updatedTodo4.completed === true,
  );
  // 7. Update multiple fields again (title and due_date) - should create separate history entries
  const finalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const finalDueDate = new Date(Date.now() + 432000000).toISOString(); // 5 days from now
  const updatedTodo5 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: finalTitle,
        due_date: finalDueDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo5);
  TestValidator.equals(
    "title updated to final",
    updatedTodo5.title,
    finalTitle,
  );
  TestValidator.equals(
    "due_date updated to final",
    updatedTodo5.due_date,
    finalDueDate,
  );
  TestValidator.equals(
    "description unchanged",
    updatedTodo5.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo5.start_date,
    newStartDate,
  );
  TestValidator.predicate(
    "completed still true",
    updatedTodo5.completed === true,
  );
  // 8. Verify final state after all updates
  TestValidator.predicate(
    "final todo has correct title",
    updatedTodo5.title === finalTitle,
  );
  TestValidator.predicate(
    "final todo has correct description",
    updatedTodo5.description === newDescription,
  );
  TestValidator.predicate(
    "final todo has correct start_date",
    updatedTodo5.start_date === newStartDate,
  );
  TestValidator.predicate(
    "final todo has correct due_date",
    updatedTodo5.due_date === finalDueDate,
  );
  TestValidator.predicate(
    "final todo is completed",
    updatedTodo5.completed === true,
  );
  TestValidator.predicate(
    "todo is not deleted",
    updatedTodo5.deleted === false,
  );
}
