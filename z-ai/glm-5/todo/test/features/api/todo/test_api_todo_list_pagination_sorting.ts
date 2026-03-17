import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodo";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create 5 todo items with staggered creation times
  const createdTodos: IPrivateTodoAppTodo[] = [];
  for (let i = 0; i < 5; i++) {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo Item ${i + 1} - ${RandomGenerator.name()}`,
        },
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Store todo IDs for comparison
  const todoIds = createdTodos.map((t) => t.id);
  // 3. Test pagination: Request page 1 with limit 3
  const page1Response = await api.functional.privateTodoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(page1Response);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 3);
  TestValidator.equals("page 1 records", page1Response.pagination.records, 5);
  TestValidator.equals("page 1 pages", page1Response.pagination.pages, 2);
  // Verify exactly 3 items returned on page 1
  TestValidator.equals("page 1 data length", page1Response.data.length, 3);
  // 4. Test pagination: Request page 2 with limit 3
  const page2Response = await api.functional.privateTodoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(page2Response);
  // Verify pagination metadata for page 2
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2Response.data.length, 2);
  // Verify different items on page 2
  const page1Ids = page1Response.data.map((t) => t.id);
  const page2Ids = page2Response.data.map((t) => t.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("no overlap between pages", !hasOverlap);
  // 5. Test sorting: Default descending order (newest first)
  const descResponse = await api.functional.privateTodoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 5,
      } satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(descResponse);
  // Verify descending order - newest first
  const descDates = descResponse.data.map((t) =>
    new Date(t.created_at).getTime(),
  );
  TestValidator.predicate(
    "descending order - newest first",
    descDates.every((date, i) => i === 0 || descDates[i - 1] >= date),
  );
  // 6. Test sorting: Ascending order (oldest first)
  const ascResponse = await api.functional.privateTodoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "asc",
        limit: 5,
      } satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(ascResponse);
  // Verify ascending order - oldest first
  const ascDates = ascResponse.data.map((t) =>
    new Date(t.created_at).getTime(),
  );
  TestValidator.predicate(
    "ascending order - oldest first",
    ascDates.every((date, i) => i === 0 || ascDates[i - 1] <= date),
  );
  // 7. Verify data isolation - all returned todos belong to the member
  const allReturnedIds = [...page1Ids, ...page2Ids];
  TestValidator.predicate(
    "all todos belong to member",
    allReturnedIds.every((id) => todoIds.includes(id)),
  );
}
