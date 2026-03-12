import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
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

/**
 * Test that an authenticated member can retrieve their own soft-deleted todos from trash.
 * Validates pagination, filtering, and data isolation for trash list operations.
 */
export async function test_api_trash_list_own_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create multiple todos with various attributes
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "First todo to delete",
        description: "This will be deleted",
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Second completed todo",
        description: "Completed task to delete",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Third todo stays active",
        description: "This one won't be deleted",
      },
    },
  );
  typia.assert(todo3);
  // 3. Soft delete first two todos to move them to trash
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  // 4. Retrieve trash list with pagination
  const trashList = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(trashList);
  // 5. Validate trash list contains exactly 2 deleted todos
  TestValidator.equals("trash count", trashList.data.length, 2);
  // 6. Verify pagination metadata
  TestValidator.equals("current page", trashList.pagination.current, 1);
  TestValidator.equals("limit", trashList.pagination.limit, 10);
  TestValidator.equals("total records", trashList.pagination.records, 2);
  TestValidator.predicate("has pages", trashList.pagination.pages >= 1);
  // 7. Validate each deleted todo has correct structure
  const deletedIds = trashList.data.map((todo) => todo.id);
  TestValidator.predicate("todo1 in trash", deletedIds.includes(todo1.id));
  TestValidator.predicate("todo2 in trash", deletedIds.includes(todo2.id));
  TestValidator.predicate("todo3 not in trash", !deletedIds.includes(todo3.id));
  // 8. Verify deleted_at timestamp exists for all trash items
  for (const todo of trashList.data) {
    TestValidator.predicate(
      `deleted_at exists for ${todo.id}`,
      todo.deleted_at !== null && todo.deleted_at !== undefined,
    );
    TestValidator.equals(
      "owner matches authenticated user",
      todo.member.id,
      memberAuth.id,
    );
  }
  // 9. Test filtering by completion status - incomplete todos
  const incompleteTrash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        completed: false,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(incompleteTrash);
  TestValidator.equals(
    "incomplete trash count",
    incompleteTrash.data.length,
    1,
  );
  TestValidator.predicate(
    "incomplete todo is todo1",
    incompleteTrash.data[0].id === todo1.id,
  );
  TestValidator.predicate(
    "incomplete todo completed is false",
    incompleteTrash.data[0].completed === false,
  );
  // 10. Test filtering by completion status - completed todos
  const completedTrash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        completed: true,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(completedTrash);
  TestValidator.equals("completed trash count", completedTrash.data.length, 1);
  TestValidator.predicate(
    "completed todo is todo2",
    completedTrash.data[0].id === todo2.id,
  );
  TestValidator.predicate(
    "completed todo completed is true",
    completedTrash.data[0].completed === true,
  );
}
