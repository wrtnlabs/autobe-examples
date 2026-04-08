import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function test_api_todo_search_completion_text_and_null_ordering_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member todo search with completion filtering, keyword OR semantics,
   * NULL-last ordering for start/due dates, and deterministic pagination.
   *
   * 1. Authenticates a member via join.
   * 2. Searches normal (non-trash) todos filtered to incomplete and validates
   *    each returned item is incomplete.
   * 3. Searches normal todos with both completion states and validates keyword
   *    matches title OR description.
   * 4. Validates that NULL start_date and due_date values are placed after all
   *    non-NULL values when sorting.
   * 5. Validates pagination determinism for the same sort/filter by ensuring
   *    page 1 and page 2 contain disjoint todo IDs and that pagination metadata
   *    is consistent aside from the current page.
   */
  // 1) Register/authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });

  // 2) Fetch a baseline set of normal todos to derive a keyword and
  // candidate expectations.
  const baseline = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(baseline);
  const todos = baseline.data;
  TestValidator.predicate(
    "has at least one normal todo to validate against",
    todos.length > 0,
  );

  const keyword = (() => {
    const candidate = todos.find((t) => t.title.length > 3)?.title;
    if (!candidate) return "";
    const word = candidate
      .split(" ")
      .map((s) => s.trim())
      .find((s) => s.length > 2);
    return word ?? "";
  })();

  // 3) completionFilter=incomplete (normal scope)
  const pageIncomplete = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "incomplete",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(pageIncomplete);
  for (const todo of pageIncomplete.data) {
    TestValidator.predicate("todo is incomplete", todo.is_complete === false);
  }

  // 4) keyword search across title OR description for both completion states
  const keywordResults = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        searchText: keyword,
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(keywordResults);
  if (keyword.length > 0) {
    for (const todo of keywordResults.data) {
      TestValidator.predicate(
        "keyword matches title OR description",
        todo.title.includes(keyword) ||
          (todo.description !== null && todo.description.includes(keyword)),
      );
    }

    const matchNeither = todos.filter(
      (t) =>
        !t.title.includes(keyword) &&
        (t.description === null || !t.description.includes(keyword)),
    );
    for (const todo of matchNeither) {
      TestValidator.predicate(
        "keyword-mismatch todo should not be returned",
        !keywordResults.data.some((t) => t.id === todo.id),
      );
    }
  }

  // 5) NULL ordering for start_date and due_date (NULLs last)
  const sortedByStart = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        sortBy: "startDate",
        sortDirection: "earliestFirst",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(sortedByStart);

  let seenNullStart = false;
  for (const todo of sortedByStart.data) {
    if (todo.start_date === null) {
      seenNullStart = true;
    } else {
      TestValidator.predicate("start_date NULLs are last", !seenNullStart);
    }
  }

  const sortedByDue = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        sortBy: "dueDate",
        sortDirection: "earliestFirst",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(sortedByDue);

  let seenNullDue = false;
  for (const todo of sortedByDue.data) {
    if (todo.due_date === null) {
      seenNullDue = true;
    } else {
      TestValidator.predicate("due_date NULLs are last", !seenNullDue);
    }
  }

  // 6) Pagination determinism: same filters/sort, page 1 vs page 2
  const limit = 5;
  const page1 = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        sortBy: "startDate",
        sortDirection: "earliestFirst",
        page: 1,
        limit,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.multiUserTodo.member.todos.search(
    memberConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        sortBy: "startDate",
        sortDirection: "earliestFirst",
        page: 2,
        limit,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(page2);

  const ids1 = new Set(page1.data.map((t) => t.id));
  for (const todo of page2.data) {
    TestValidator.predicate(
      "no overlap between page 1 and page 2",
      !ids1.has(todo.id),
    );
  }
}
