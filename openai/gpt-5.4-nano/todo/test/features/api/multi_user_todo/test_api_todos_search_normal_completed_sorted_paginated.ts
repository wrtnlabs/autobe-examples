import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import type { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
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

export async function test_api_todos_search_normal_completed_sorted_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth: create a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(auth);

  // 2) Create 3 member-owned todos (A incomplete, B/C complete)
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo A ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoA);

  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo B ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoB);

  // Ensure distinct created timestamps for ordering assertions
  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  await wait(10);

  const todoC = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo C ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoC);

  // 3) Search normal + completed-only + newest-first + pagination
  const searchResponse = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        listMode: "normal",
        completionStatus: "complete",
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(searchResponse);

  // 4) Validate pagination metadata presence and constraints
  TestValidator.predicate(
    "pagination current should match requested page (1-indexed)",
    () =>
      searchResponse.pagination.pagination.current === 1 &&
      searchResponse.pagination.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    () =>
      searchResponse.pagination.pagination.pages >= 0 &&
      searchResponse.pagination.pagination.records >= 0,
  );

  const items = searchResponse.data;

  TestValidator.equals(
    "should return exactly 2 completed todos",
    items.length,
    2,
  );

  // 5) Ensure returned items are completed, belong to member, and are B/C only
  const returnedIds = items.map((i) => i.id);

  TestValidator.predicate("returned todos are all completed", () =>
    items.every((i) => i.is_complete === true),
  );

  const expectedIds = [todoB, todoC]
    .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
    .map((t) => t.id);

  TestValidator.predicate(
    "completed todos should be ordered newest-first by created_at",
    () =>
      returnedIds.length === expectedIds.length &&
      returnedIds.every((id, idx) => id === expectedIds[idx]),
  );

  TestValidator.predicate(
    "returned ids should be todoB and todoC only",
    () =>
      returnedIds.includes(todoB.id) &&
      returnedIds.includes(todoC.id) &&
      !returnedIds.includes(todoA.id),
  );

  // 6) Normal list semantics: not deleted/trashed
  TestValidator.predicate(
    "normal list results must not have deleted_at",
    () => items.every((i) => i.deleted_at === null),
  );

  // 7) Ownership isolation: since todos were created with same auth, all ids should correspond
  // to created todos; absence of unrelated ids is already covered by id set check.
  TestValidator.predicate(
    "all returned todos are from the created set",
    () => returnedIds.every((id) => id === todoB.id || id === todoC.id),
  );
}
