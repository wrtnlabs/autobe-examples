import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_listing_pagination_with_page_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create 5 todos (more than page size of 2)
  const createdTodos = await ArrayUtil.asyncRepeat(5, async () =>
    generate_random_multi_user_todo_member_todos_create(memberConnection, {}),
  );
  // 3. Get first page with limit=2
  const page1 = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(page1);
  // 4. Get second page with limit=2
  const page2 = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(page2);
  // 5. Validate page 1
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 2", page1.pagination.limit, 2);
  TestValidator.equals("page 1 records is 5", page1.pagination.records, 5);
  TestValidator.equals("page 1 pages is 3", page1.pagination.pages, 3);
  // 6. Validate page 2
  TestValidator.equals("page 2 has 2 items", page2.data.length, 2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 2", page2.pagination.limit, 2);
  TestValidator.equals("page 2 records is 5", page2.pagination.records, 5);
  TestValidator.equals("page 2 pages is 3", page2.pagination.pages, 3);
  // 7. Verify no duplicate items between pages
  const page1Ids = new Set(page1.data.map((todo) => todo.id));
  for (const todo of page2.data) {
    TestValidator.predicate(
      "page 2 todo not in page 1",
      !page1Ids.has(todo.id),
    );
  }
}
