import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    },
  });
  typia.assert(memberAuthorized);
  // 2. Create a todo item that will be deleted and restored
  const todoTitle = "Test Todo to Restore";
  const todoDescription = "This todo will be deleted and restored";
  const todoStartDate = new Date().toISOString();
  const todoDueDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        startDate: todoStartDate,
        dueDate: todoDueDate,
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const todoId = todo.id;
  // 3. Soft delete the todo (move to trash)
  await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
    todoId: todoId,
  });
  // 4. Restore the todo from trash
  const restoredTodo =
    await api.functional.multiUserTodoApp.member.todos.restore(
      memberConnection,
      {
        todoId: todoId,
      },
    );
  typia.assert(restoredTodo);
  // 5. Validate the restored todo
  TestValidator.equals("restored todo id", restoredTodo.id, todoId);
  TestValidator.equals("restored todo title", restoredTodo.title, todoTitle);
  TestValidator.equals(
    "restored todo description",
    restoredTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "restored todo start date",
    restoredTodo.startDate,
    todoStartDate,
  );
  TestValidator.equals(
    "restored todo due date",
    restoredTodo.dueDate,
    todoDueDate,
  );
  TestValidator.equals(
    "restored todo completed",
    restoredTodo.isCompleted,
    false,
  );
  TestValidator.equals("restored todo deletedAt", restoredTodo.deletedAt, null);
  TestValidator.equals(
    "restored todo createdAt",
    restoredTodo.createdAt,
    todo.createdAt,
  );
  TestValidator.notEquals(
    "restored todo updatedAt",
    restoredTodo.updatedAt,
    todo.updatedAt,
  );
  // 6. Validate user information is preserved
  TestValidator.equals(
    "restored todo user id",
    restoredTodo.user.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "restored todo user email",
    restoredTodo.user.email,
    memberEmail,
  );
}