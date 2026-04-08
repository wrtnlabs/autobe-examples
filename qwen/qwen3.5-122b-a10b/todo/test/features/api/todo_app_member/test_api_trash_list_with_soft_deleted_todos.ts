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

export async function test_api_trash_list_with_soft_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first todo
  const todo1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // 3. Create second todo (completed)
  const todo2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // 4. Soft delete first todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  // 5. Soft delete second todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  // 6. Retrieve trash list with pagination
  const trashList = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 7. Verify pagination metadata
  TestValidator.equals("current page", trashList.pagination.current, 1);
  TestValidator.equals("limit", trashList.pagination.limit, 10);
  TestValidator.predicate("has records", trashList.pagination.records > 0);
  TestValidator.predicate("has pages", trashList.pagination.pages > 0);
  // 8. Verify data array contains soft-deleted todos
  TestValidator.predicate("has data array", trashList.data.length > 0);
  TestValidator.predicate(
    "has at least 2 deleted todos",
    trashList.data.length >= 2,
  );
  // 9. Verify all todos have deleted_at set
  for (const todo of trashList.data) {
    TestValidator.predicate(
      "deleted_at is set",
      todo.deleted_at !== null && todo.deleted_at !== undefined,
    );
  }
  // 10. Verify todos are sorted by deleted_at descending
  const deletedAts = trashList.data.map((t) =>
    t.deleted_at ? new Date(t.deleted_at).getTime() : 0,
  );
  for (let i = 0; i < deletedAts.length - 1; i++) {
    TestValidator.predicate(
      `deleted_at[${i}] >= deleted_at[${i + 1}]`,
      deletedAts[i] >= deletedAts[i + 1],
    );
  }
  // 11. Verify original attributes are retained
  const deletedTodoIds = new Set([todo1.id, todo2.id]);
  for (const todo of trashList.data) {
    TestValidator.predicate("todo id exists", deletedTodoIds.has(todo.id));
    TestValidator.predicate("title exists", todo.title.length > 0);
    TestValidator.predicate(
      "is_completed is boolean",
      typeof todo.is_completed === "boolean",
    );
    TestValidator.predicate("created_at exists", todo.created_at.length > 0);
    TestValidator.predicate("updated_at exists", todo.updated_at.length > 0);
    TestValidator.predicate("member exists", todo.member.id !== undefined);
  }
}
