import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoTrashEntry";
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

export async function test_api_trash_view_populated_trash_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member using SDK function (utility function not available)
  const memberAuth = await api.functional.multiUserTodo.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        display_name: "Test User",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Create multiple todos using SDK function
  const todos = [];
  for (let i = 0; i < 5; i++) {
    const todo = await api.functional.multiUserTodo.member.todos.create(
      memberConnection,
      {
        body: {
          title: `Todo ${i + 1}: Test Todo`,
          description: i % 2 === 0 ? "Test description" : null,
          startDate: i % 2 === 0 ? new Date().toISOString() : null,
          dueDate:
            i % 3 === 0 ? new Date(Date.now() + 86400000).toISOString() : null,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // Soft-delete 4 todos to populate trash
  const deletedTodoIds = todos.slice(0, 4).map((todo) => todo.id);
  for (const todoId of deletedTodoIds) {
    await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
      todoId: todoId satisfies string & tags.Format<"uuid">,
    });
  }
  // Test pagination with page 1, limit 2
  const page1Response =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata
  if (page1Response.pagination.current !== 1) {
    throw new Error(
      `Expected current page to be 1, but got ${page1Response.pagination.current}`,
    );
  }
  if (page1Response.pagination.limit !== 2) {
    throw new Error(
      `Expected limit to be 2, but got ${page1Response.pagination.limit}`,
    );
  }
  if (page1Response.pagination.records !== 4) {
    throw new Error(
      `Expected total records to be 4, but got ${page1Response.pagination.records}`,
    );
  }
  if (page1Response.pagination.pages !== 2) {
    throw new Error(
      `Expected total pages to be 2, but got ${page1Response.pagination.pages}`,
    );
  }
  // Validate trash entries
  if (page1Response.data.length !== 2) {
    throw new Error(
      `Expected 2 entries on page 1, but got ${page1Response.data.length}`,
    );
  }
  for (const trashEntry of page1Response.data) {
    if (!trashEntry.deleted_at) {
      throw new Error("Trash entry should have deletion timestamp");
    }
    if (trashEntry.restored_at !== null) {
      throw new Error("Trash entry should not be restored");
    }
    if (trashEntry.permanently_deleted_at !== null) {
      throw new Error("Trash entry should not be permanently deleted");
    }
    if (!trashEntry.todo.title) {
      throw new Error("Todo should have a title");
    }
  }
  // Test pagination with page 2
  const page2Response =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata for page 2
  if (page2Response.pagination.current !== 2) {
    throw new Error(
      `Expected current page to be 2, but got ${page2Response.pagination.current}`,
    );
  }
  if (page2Response.data.length !== 2) {
    throw new Error(
      `Expected 2 entries on page 2, but got ${page2Response.data.length}`,
    );
  }
  // Verify no overlap between pages
  const page1Ids = page1Response.data.map((entry) => entry.todo.id);
  const page2Ids = page2Response.data.map((entry) => entry.todo.id);
  for (const id of page1Ids) {
    if (page2Ids.includes(id)) {
      throw new Error(`Found duplicate ID ${id} across pages`);
    }
  }
  // Test with different limit
  const customLimitResponse =
    await api.functional.multiUserTodo.member.todos.trash_entries.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoTodoTrashEntry.IRequest,
      },
    );
  typia.assert(customLimitResponse);
  if (customLimitResponse.pagination.pages !== 2) {
    throw new Error(
      `Expected 2 pages with limit 3, but got ${customLimitResponse.pagination.pages}`,
    );
  }
  if (customLimitResponse.data.length !== 3) {
    throw new Error(
      `Expected 3 entries with limit 3, but got ${customLimitResponse.data.length}`,
    );
  }
}
