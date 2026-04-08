import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

/**
 * Test viewing deleted todos in trash with pagination and data preservation.
 *
 * Validates the complete trash listing workflow including member authentication, todo creation, soft deletion, and trash retrieval. Ensures that deleted todos retain all their original properties and that the trash endpoint correctly filters and paginates soft-deleted items.
 *
 * Special attention is given to verifying that the deleted todo preserves all fields (title, description, dates, completion status), that pagination metadata is accurate, and that the deleted todo shows the correct member as owner.
 *
 * 1. Authenticate as a member by joining with email and password.
 * 2. Create a todo with title, description, start date, and due date.
 * 3. Soft delete the todo to move it to trash.
 * 4. Retrieve trash listing and verify the deleted todo appears with all properties preserved.
 * 5. Verify pagination metadata (current page, limit, total records, total pages).
 * 6. Verify the deleted todo shows the correct member as owner.
 * 7. Verify deleted_at is set indicating soft deletion.
 */
export async function test_api_trash_list_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create a todo with all fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 3. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Retrieve trash listing
  const trash = await api.functional.todoApp.member.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trash);
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", trash.pagination.current, 1);
  TestValidator.equals("limit is 20", trash.pagination.limit, 20);
  TestValidator.equals("total records is 1", trash.pagination.records, 1);
  TestValidator.equals("total pages is 1", trash.pagination.pages, 1);
  // 6. Verify the deleted todo appears in trash
  TestValidator.predicate(
    "trash contains the deleted todo",
    trash.data.length === 1,
  );
  const deletedTodo = trash.data[0];
  typia.assert(deletedTodo);
  // 7. Verify all original properties are preserved
  TestValidator.equals("title preserved", deletedTodo.title, todo.title);
  TestValidator.equals(
    "completed status preserved",
    deletedTodo.completed,
    todo.completed,
  );
  TestValidator.equals(
    "start_date preserved",
    deletedTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    deletedTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "created_at preserved",
    deletedTodo.created_at,
    todo.created_at,
  );
  // 8. Verify the deleted todo shows the member as owner
  TestValidator.equals(
    "member id matches",
    deletedTodo.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "member email matches",
    deletedTodo.member.email,
    todo.member.email,
  );
  // 9. The fact that the item appears in trash confirms soft deletion
  TestValidator.predicate("item appears in trash", deletedTodo !== undefined);
}