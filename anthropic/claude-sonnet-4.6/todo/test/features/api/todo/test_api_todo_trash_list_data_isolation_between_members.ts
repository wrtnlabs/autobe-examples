import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_trash_list_data_isolation_between_members(
  connection: api.IConnection,
): Promise<void> {
  // ── Member A setup ──────────────────────────────────────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Create 2 todos as Member A
  const todoA1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA1);
  const todoA2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA2);
  // Soft-delete both todos as Member A
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA2.id,
  });
  // ── Member B setup ──────────────────────────────────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Create 1 todo as Member B
  const todoB1 = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {},
  );
  typia.assert(todoB1);
  // Soft-delete the todo as Member B
  await api.functional.todoApp.member.todos.erase(memberBConnection, {
    todoId: todoB1.id,
  });
  // ── Fetch Member A's trash list ─────────────────────────────────────────────
  const trashA = await api.functional.todoApp.member.todos.trashed.index(
    memberAConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashA);
  // Member A should have exactly 2 trashed items
  TestValidator.equals(
    "Member A trash count (records)",
    trashA.pagination.records,
    2,
  );
  TestValidator.equals("Member A trash data length", trashA.data.length, 2);
  // All items in Member A's trash must have IDs from Member A's todos
  const memberATodoIds = new Set([todoA1.id, todoA2.id]);
  const memberBTodoIds = new Set([todoB1.id]);
  for (const item of trashA.data) {
    TestValidator.predicate(
      "Member A trash item belongs to Member A",
      memberATodoIds.has(item.id),
    );
    TestValidator.predicate(
      "Member A trash item does NOT belong to Member B",
      !memberBTodoIds.has(item.id),
    );
  }
  // ── Fetch Member B's trash list ─────────────────────────────────────────────
  const trashB = await api.functional.todoApp.member.todos.trashed.index(
    memberBConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashB);
  // Member B should have exactly 1 trashed item
  TestValidator.equals(
    "Member B trash count (records)",
    trashB.pagination.records,
    1,
  );
  TestValidator.equals("Member B trash data length", trashB.data.length, 1);
  // The single item in Member B's trash must match Member B's todo
  TestValidator.predicate(
    "Member B trash item belongs to Member B",
    memberBTodoIds.has(trashB.data[0]!.id),
  );
  TestValidator.predicate(
    "Member B trash item does NOT belong to Member A",
    !memberATodoIds.has(trashB.data[0]!.id),
  );
  // ── Pagination test for Member A ────────────────────────────────────────────
  // Page 1, limit 1
  const trashAPage1 = await api.functional.todoApp.member.todos.trashed.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashAPage1);
  TestValidator.equals(
    "Member A page 1 limit 1: pagination.pages",
    trashAPage1.pagination.pages,
    2,
  );
  TestValidator.equals(
    "Member A page 1 limit 1: pagination.limit",
    trashAPage1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "Member A page 1 limit 1: data length",
    trashAPage1.data.length,
    1,
  );
  // Page 2, limit 1
  const trashAPage2 = await api.functional.todoApp.member.todos.trashed.index(
    memberAConnection,
    {
      body: {
        page: 2,
        limit: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashAPage2);
  TestValidator.equals(
    "Member A page 2 limit 1: data length",
    trashAPage2.data.length,
    1,
  );
  // Ensure page 1 and page 2 return different items
  TestValidator.predicate(
    "Member A page 1 and page 2 return different items",
    trashAPage1.data[0]!.id !== trashAPage2.data[0]!.id,
  );
  // Both page items should belong to Member A
  TestValidator.predicate(
    "Member A page 1 item belongs to Member A",
    memberATodoIds.has(trashAPage1.data[0]!.id),
  );
  TestValidator.predicate(
    "Member A page 2 item belongs to Member A",
    memberATodoIds.has(trashAPage2.data[0]!.id),
  );
}
