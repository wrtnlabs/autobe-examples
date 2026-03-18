import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import type { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_out_of_range_page_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2) Create a todo and generate 2 edit-history entries via two updates
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {},
  );
  const todoAId = todoA.id;
  await api.functional.multiUserTodo.member.todos.update(userConnection, {
    todoId: todoAId,
    body: {
      edited_at: new Date().toISOString(),
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  await api.functional.multiUserTodo.member.todos.update(userConnection, {
    todoId: todoAId,
    body: {
      edited_at: new Date(Date.now() + 10).toISOString(),
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  // 3) Request out-of-range page with limit=1
  const limit1 = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page3 = 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageA =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      userConnection,
      {
        todoId: todoAId,
        body: {
          page: page3,
          limit: limit1,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(pageA);
  TestValidator.equals("edit history data is empty", pageA.data.length, 0);
  TestValidator.equals(
    "pagination records total",
    pageA.pagination.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages total",
    pageA.pagination.pagination.pages,
    2,
  );
  TestValidator.predicate(
    "pagination current is requested or normalized",
    pageA.pagination.pagination.current === 3 ||
      pageA.pagination.pagination.current === 2,
  );
  // 4) Repeat for another todo to ensure scoping by todoId
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {},
  );
  const todoBId = todoB.id;
  await api.functional.multiUserTodo.member.todos.update(userConnection, {
    todoId: todoBId,
    body: {
      edited_at: new Date(Date.now() + 20).toISOString(),
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const pageB =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      userConnection,
      {
        todoId: todoBId,
        body: {
          page: page3,
          limit: limit1,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(pageB);
  TestValidator.equals(
    "edit history data is empty for todoB",
    pageB.data.length,
    0,
  );
  TestValidator.equals(
    "todoB pagination records are not leaked from todoA",
    pageB.pagination.pagination.records,
    1,
  );
  TestValidator.equals(
    "todoB pagination pages",
    pageB.pagination.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "todoB pagination current is requested or normalized",
    pageB.pagination.pagination.current === 3 ||
      pageB.pagination.pagination.current === 1,
  );
}
