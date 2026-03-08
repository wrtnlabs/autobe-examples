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

export async function test_api_todo_restore_preserves_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedMember.token.access },
  };
  // 3. Create initial todo
  const initialTitle = "Initial Todo Title";
  const initialDescription = "Initial todo description";
  const initialDueDate = new Date(
    new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        due_date: initialDueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo created with initial data",
    todo.title,
    initialTitle,
  );
  // 4. First edit - change title
  const firstEditTitle = "First Edit - Updated Title";
  const editedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(editedTodo1);
  TestValidator.equals(
    "first edit updated title",
    editedTodo1.title,
    firstEditTitle,
  );
  const firstEditUpdatedAt = editedTodo1.updated_at;
  // 5. Second edit - change description
  const secondEditDescription = "Second Edit - New Description";
  const editedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: secondEditDescription,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(editedTodo2);
  TestValidator.equals(
    "second edit updated description",
    editedTodo2.description,
    secondEditDescription,
  );
  const secondEditUpdatedAt = editedTodo2.updated_at;
  // 6. Third edit - change due date
  const thirdEditDueDate = new Date(
    new Date().getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const editedTodo3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        due_date: thirdEditDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(editedTodo3);
  TestValidator.equals(
    "third edit updated due date",
    editedTodo3.due_date,
    thirdEditDueDate,
  );
  const thirdEditUpdatedAt = editedTodo3.updated_at;
  // 7. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 8. Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restoredTodo);
  // 9. Verify todo is no longer deleted
  TestValidator.equals(
    "restored todo has is_deleted=false",
    restoredTodo.is_deleted,
    false,
  );
  // 10. Verify current state matches last edit (third edit)
  TestValidator.equals(
    "title preserved after restore",
    restoredTodo.title,
    firstEditTitle,
  );
  TestValidator.equals(
    "description preserved after restore",
    restoredTodo.description,
    secondEditDescription,
  );
  TestValidator.equals(
    "due_date preserved after restore",
    restoredTodo.due_date,
    thirdEditDueDate,
  );
  TestValidator.equals(
    "completion status preserved",
    restoredTodo.is_complete,
    false,
  );
  // 11. Verify updated_at timestamp reflects last edit time (not restore time)
  TestValidator.equals(
    "updated_at matches third edit",
    restoredTodo.updated_at,
    thirdEditUpdatedAt,
  );
  // 12. Verify author still correct
  TestValidator.equals(
    "author ID preserved",
    restoredTodo.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "author name preserved",
    restoredTodo.author.displayName,
    authorizedMember.display_name,
  );
}
