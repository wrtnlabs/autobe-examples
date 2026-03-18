import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
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

export async function test_api_trash_list_member_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member auth
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const actorConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2) Create todos and move to trash
  const limit = 5 as number;
  const desiredTotal = limit * 2 + 3;
  const todos = await Promise.all(
    ArrayUtil.repeat(desiredTotal, () =>
      generate_random_multi_user_todo_member_todos_create(actorConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      }),
    ),
  );
  const todoIds = todos.map((t) => t.id);
  await ArrayUtil.asyncForEach(todoIds, async (todoId) => {
    await api.functional.multiUserTodo.member.todos.erase(actorConnection, {
      todoId,
    });
  });
  // 3) Page 1
  const page1 = 1 as number;
  const requestBase = {
    completionStatus: "all" as const,
    sortBy: "createdAt" as const,
    sortOrder: "asc" as const,
  };
  const resp1 = await api.functional.multiUserTodo.member.trash.index(
    actorConnection,
    {
      body: {
        ...requestBase,
        page: page1,
        limit,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(resp1);
  TestValidator.equals(
    "pagination current page 1",
    resp1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit page 1",
    resp1.pagination.limit,
    limit,
  );
  const expectedPages1 =
    resp1.pagination.records === 0
      ? 0
      : Math.ceil(resp1.pagination.records / resp1.pagination.limit);
  TestValidator.equals(
    "pagination pages computed",
    resp1.pagination.pages,
    expectedPages1,
  );
  TestValidator.predicate("data length <= limit", resp1.data.length <= limit);
  // 4) Page 2
  const page2 = 2 as number;
  const resp2 = await api.functional.multiUserTodo.member.trash.index(
    actorConnection,
    {
      body: {
        ...requestBase,
        page: page2,
        limit,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(resp2);
  TestValidator.equals(
    "pagination current page 2",
    resp2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit page 2",
    resp2.pagination.limit,
    limit,
  );
  const ids1 = resp1.data.map((x) => x.id);
  const ids2 = resp2.data.map((x) => x.id);
  if (ids1.length > 0 && ids2.length > 0) {
    TestValidator.predicate(
      "page2 ids are not all in page1",
      ids2.some((id) => !ids1.includes(id)),
    );
    const overlap = ids1.filter((id) => ids2.includes(id));
    TestValidator.equals(
      "no overlap between page1 and page2",
      overlap.length,
      0,
    );
  }
  // 5) Page within range
  const pages = resp1.pagination.pages;
  if (pages > 0) {
    const inRangePage = pages >= 3 ? 3 : pages;
    const respInRange = await api.functional.multiUserTodo.member.trash.index(
      actorConnection,
      {
        body: {
          ...requestBase,
          page: inRangePage,
          limit,
        } satisfies IMultiUserTodoGuest.IRequest,
      },
    );
    typia.assert(respInRange);
    TestValidator.equals(
      "pagination current in-range page",
      respInRange.pagination.current,
      inRangePage,
    );
    TestValidator.predicate(
      "in-range data length <= limit",
      respInRange.data.length <= limit,
    );
    // 6) Beyond range
    const beyondPage = pages + 1;
    const respBeyond = await api.functional.multiUserTodo.member.trash.index(
      actorConnection,
      {
        body: {
          ...requestBase,
          page: beyondPage,
          limit,
        } satisfies IMultiUserTodoGuest.IRequest,
      },
    );
    typia.assert(respBeyond);
    TestValidator.equals(
      "pagination current beyond range",
      respBeyond.pagination.current,
      beyondPage,
    );
    TestValidator.equals("data empty beyond range", respBeyond.data.length, 0);
  }
}
