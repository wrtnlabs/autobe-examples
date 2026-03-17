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

export async function test_api_todo_list_pagination_and_trash_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create 5 todos
  const todos = await ArrayUtil.asyncRepeat(5, async () => {
    return generate_random_todo_app_member_todos_create(memberConnection, {});
  });
  todos.forEach((todo) => typia.assert(todo));
  // 3. Soft-delete 2 todos (the first two)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todos[0].id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todos[1].id,
  });
  // 4. Active todos - page 1, limit 2 (3 active todos total, should get 2)
  const activePage1 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        visibility: "active",
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(activePage1);
  // 5. Verify active page 1
  TestValidator.equals(
    "active page 1 - current page",
    activePage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "active page 1 - records total",
    activePage1.pagination.records,
    3,
  );
  TestValidator.equals(
    "active page 1 - pages total",
    activePage1.pagination.pages,
    2,
  );
  TestValidator.equals(
    "active page 1 - data length",
    activePage1.data.length,
    2,
  );
  activePage1.data.forEach((item) => {
    TestValidator.equals(
      "active page 1 - trashed_at is null",
      item.trashed_at,
      null,
    );
  });
  // 6. Active todos - page 2, limit 2 (should get 1 remaining)
  const activePage2 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        visibility: "active",
        page: 2,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(activePage2);
  // 7. Verify active page 2
  TestValidator.equals(
    "active page 2 - current page",
    activePage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "active page 2 - records total",
    activePage2.pagination.records,
    3,
  );
  TestValidator.equals(
    "active page 2 - pages total",
    activePage2.pagination.pages,
    2,
  );
  TestValidator.equals(
    "active page 2 - data length",
    activePage2.data.length,
    1,
  );
  activePage2.data.forEach((item) => {
    TestValidator.equals(
      "active page 2 - trashed_at is null",
      item.trashed_at,
      null,
    );
  });
  // 8. Trashed todos - page 1, limit 10
  const trashedPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        visibility: "trashed",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedPage);
  // 9. Verify trashed todos
  TestValidator.equals(
    "trashed - records total",
    trashedPage.pagination.records,
    2,
  );
  TestValidator.equals("trashed - data length", trashedPage.data.length, 2);
  trashedPage.data.forEach((item) => {
    TestValidator.predicate(
      "trashed - trashed_at is non-null",
      item.trashed_at !== null,
    );
  });
  // 10. Out-of-bounds page - active, page 99
  const outOfBoundsPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        visibility: "active",
        page: 99,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(outOfBoundsPage);
  // 11. Verify out-of-bounds returns empty data with correct metadata
  TestValidator.equals(
    "out-of-bounds - data length",
    outOfBoundsPage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-bounds - records total",
    outOfBoundsPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "out-of-bounds - pages total",
    outOfBoundsPage.pagination.pages,
    2,
  );
}
