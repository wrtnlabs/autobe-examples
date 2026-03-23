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
 * Test trash filtering and sorting functionality.
 *
 * Validates that the trash listing endpoint correctly applies filtering by
 * completion status and sorting by various date fields. Tests pagination
 * integration with filters and ensures user isolation.
 */
export async function test_api_trash_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create multiple todos with different dates
  const todos: IMultiUserTodoTodo[] = [];
  // Create todos with varying dates (all will be incomplete by default)
  for (let i = 0; i < 6; i++) {
    const todo = await api.functional.multiUserTodo.member.todos.create(
      memberConnection,
      {
        body: {
          title: `Todo ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          start_date:
            i % 2 === 0
              ? new Date(
                  Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
                ).toISOString()
              : undefined,
          due_date:
            i % 3 === 0
              ? new Date(
                  Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
                ).toISOString()
              : undefined,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // 3. Soft delete todos to populate trash
  const deletedTodoIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
      todoId: todos[i].id,
    });
    deletedTodoIds.push(todos[i].id);
  }
  // 4. Test trash listing with no filter (all items)
  const allTrash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(allTrash);
  TestValidator.equals("all trash count", allTrash.data.length, 5);
  TestValidator.equals(
    "all trash pagination records",
    allTrash.pagination.records,
    5,
  );
  // 5. Test filtering by completed=false (incomplete) - should return all
  const incompleteTrash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        completed: false,
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(incompleteTrash);
  TestValidator.equals(
    "incomplete filter returns all deleted todos",
    incompleteTrash.data.length,
    5,
  );
  TestValidator.predicate(
    "incomplete filter returns only incomplete todos",
    incompleteTrash.data.every((todo) => todo.completed === false),
  );
  // 6. Test filtering by completed=true (completed) - should return empty
  const completedTrash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        completed: true,
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(completedTrash);
  TestValidator.equals(
    "completed filter returns empty (no completed todos in trash)",
    completedTrash.data.length,
    0,
  );
  TestValidator.equals(
    "completed filter pagination records",
    completedTrash.pagination.records,
    0,
  );
  // 7. Test sorting by created_at descending (newest first)
  const sortedByCreatedDesc =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByCreatedDesc);
  TestValidator.predicate(
    "created_at descending order",
    sortedByCreatedDesc.data.every((todo, index, array) => {
      if (index === 0) return true;
      return new Date(array[index - 1].created_at) >= new Date(todo.created_at);
    }),
  );
  // 8. Test sorting by created_at ascending (oldest first)
  const sortedByCreatedAsc =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByCreatedAsc);
  TestValidator.predicate(
    "created_at ascending order",
    sortedByCreatedAsc.data.every((todo, index, array) => {
      if (index === 0) return true;
      return new Date(array[index - 1].created_at) <= new Date(todo.created_at);
    }),
  );
  // 9. Test sorting by start_date ascending (earliest first, nulls last)
  const sortedByStartDate =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(sortedByStartDate);
  TestValidator.predicate(
    "start_date ascending order (nulls last)",
    sortedByStartDate.data.every((todo, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1].start_date;
      const curr = todo.start_date;
      if (prev === null && curr === null) return true;
      if (prev === null) return false;
      if (curr === null) return true;
      if (prev === undefined || curr === undefined) return false;
      return new Date(prev) <= new Date(curr);
    }),
  );
  // 10. Test sorting by due_date descending (latest first, nulls last)
  const sortedByDueDate = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        sortBy: "due_date",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(sortedByDueDate);
  TestValidator.predicate(
    "due_date descending order (nulls last)",
    sortedByDueDate.data.every((todo, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1].due_date;
      const curr = todo.due_date;
      if (prev === null && curr === null) return true;
      if (prev === null) return false;
      if (curr === null) return true;
      if (prev === undefined || curr === undefined) return false;
      return new Date(prev) >= new Date(curr);
    }),
  );
  // 11. Test pagination with filter
  const paginatedTrash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        completed: false,
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 2,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(paginatedTrash);
  TestValidator.equals(
    "pagination limit respected",
    paginatedTrash.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedTrash.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginatedTrash.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records",
    paginatedTrash.pagination.records,
    5,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedTrash.pagination.pages >= 3,
  );
  // 12. Test page 2 of pagination
  const page2Trash = await api.functional.multiUserTodo.member.trash.index(
    memberConnection,
    {
      body: {
        completed: false,
        sortBy: "created_at",
        sortOrder: "desc",
        page: 2,
        limit: 2,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(page2Trash);
  TestValidator.equals("page 2 data length", page2Trash.data.length, 2);
  TestValidator.equals("page 2 current page", page2Trash.pagination.current, 2);
  // 13. Verify all deleted todos have deleted_at timestamp
  TestValidator.predicate(
    "all trash items have deleted_at",
    allTrash.data.every(
      (todo) => todo.deleted_at !== null && todo.deleted_at !== undefined,
    ),
  );
  // 14. Verify user isolation - all todos belong to authenticated user
  TestValidator.predicate(
    "all trash items belong to authenticated user",
    allTrash.data.every((todo) => todo.member.id === authorized.id),
  );
  // 15. Verify deleted todo IDs match what we deleted
  const trashIds = allTrash.data.map((todo) => todo.id);
  TestValidator.predicate(
    "trash contains exactly the deleted todos",
    deletedTodoIds.every((id) => trashIds.includes(id)) &&
      trashIds.every((id) => deletedTodoIds.includes(id)),
  );
}