import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
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

export async function test_api_member_trash_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo item
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        startDate: typia.random<string & tags.Format<"date-time">>(),
        dueDate: typia.random<string & tags.Format<"date-time">>(),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash)
  await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Retrieve trash listing
  const trashResponse =
    await api.functional.multiUserTodoApp.member.todos.trash.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoAppTodo.IRequest,
      },
    );
  typia.assert(trashResponse);
  // 5. Validate trash response
  // Check pagination metadata
  TestValidator.equals(
    "pagination current page",
    trashResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", trashResponse.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    trashResponse.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages", trashResponse.pagination.pages, 1);
  // Check that the deleted todo appears in the trash list
  TestValidator.equals("trash data array length", trashResponse.data.length, 1);
  // Validate the deleted todo in the list
  const deletedTodo = trashResponse.data[0];
  typia.assert(deletedTodo);
  TestValidator.equals("todo id matches", deletedTodo.id, todo.id);
  TestValidator.equals("todo title matches", deletedTodo.title, todo.title);
  TestValidator.equals(
    "todo description matches",
    deletedTodo.description,
    todo.description,
  );
  TestValidator.predicate(
    "deletedAt timestamp is non-null",
    deletedTodo.deleted_at !== null,
  );
  TestValidator.predicate(
    "deletedAt is valid date-time",
    !Number.isNaN(Date.parse(deletedTodo.deleted_at!)),
  );
  // Check that all expected fields are present
  TestValidator.predicate(
    "todo has startDate field",
    deletedTodo.start_date !== undefined,
  );
  TestValidator.predicate(
    "todo has dueDate field",
    deletedTodo.due_date !== undefined,
  );
  TestValidator.predicate(
    "todo has isCompleted field",
    deletedTodo.is_completed !== undefined,
  );
  TestValidator.predicate(
    "todo has createdAt field",
    deletedTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "todo has updatedAt field",
    deletedTodo.updated_at !== undefined,
  );
}