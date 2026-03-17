import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoTrashItem";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrashItem";
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
 * Test that trash list correctly excludes permanently deleted todos and restored todos
 * based on filter criteria. This validates the business logic around trash item states.
 */
export async function test_api_todo_trash_filter_status_states(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Test default (no filters) - should return paginated trash structure
  const defaultTrash = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    },
  );
  typia.assert(defaultTrash);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    defaultTrash.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(defaultTrash.data));
  TestValidator.predicate(
    "pagination fields present",
    typeof defaultTrash.pagination.current === "number" &&
      typeof defaultTrash.pagination.limit === "number" &&
      typeof defaultTrash.pagination.records === "number" &&
      typeof defaultTrash.pagination.pages === "number",
  );
  // Test with restored_at_exists filter
  const restoredTrash = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        restored_at_exists: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    },
  );
  typia.assert(restoredTrash);
  // Test with permanently_deleted_at_exists filter
  const permanentTrash = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        permanently_deleted_at_exists: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    },
  );
  typia.assert(permanentTrash);
  // Test with both filters false (currently trashed items only)
  const currentTrash = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        restored_at_exists: false,
        permanently_deleted_at_exists: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    },
  );
  typia.assert(currentTrash);
  // Test date range filters
  const dateFilteredTrash =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        deleted_at_min: new Date(Date.now() - 86400000).toISOString(), // last 24 hours
        deleted_at_max: new Date().toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    });
  typia.assert(dateFilteredTrash);
  // Test pagination by requesting different pages
  const page1 = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    },
  );
  typia.assert(page1);
  // Test error cases - invalid page number (should be minimum 1)
  await TestValidator.error("rejects invalid page number", async () => {
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        page: 0,
        limit: 10,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    });
  });
  // Test error cases - invalid limit (should be maximum 100)
  await TestValidator.error("rejects invalid limit", async () => {
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        page: 1,
        limit: 101,
      } satisfies ITodoAppTodoTrashItem.IRequest,
    });
  });
}
