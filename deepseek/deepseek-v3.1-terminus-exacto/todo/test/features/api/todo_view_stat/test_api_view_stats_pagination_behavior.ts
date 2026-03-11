import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test pagination behavior with various page and limit parameters.
 * Authenticate as a member, then make multiple calls to view-stats with different pagination settings:
 * (1) Default values (no page/limit specified should use defaults)
 * (2) Explicit page=1, limit=10
 * (3) Request page beyond available data (should return empty data array but maintain pagination metadata).
 * Verify that pagination metadata correctly reflects total records and pages calculation.
 * Check that the data array size respects the limit parameter except for the last page.
 * Ensure that moving between pages returns different sets of records without duplication.
 * Validate that pagination maintains data isolation to the authenticated member only.
 */
export async function test_api_view_stats_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Test Case 1: Default pagination (no page/limit)
  const defaultPage =
    await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate default pagination metadata
  TestValidator.predicate(
    "default page current should be 1",
    defaultPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "default limit should be positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array size should not exceed limit",
    defaultPage.data.length <= defaultPage.pagination.limit,
  );
  // 3. Test Case 2: Explicit page=1, limit=10
  const explicitPage =
    await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
  typia.assert(explicitPage);
  // Validate explicit pagination
  TestValidator.equals(
    "explicit page number",
    explicitPage.pagination.current,
    1,
  );
  TestValidator.equals("explicit limit", explicitPage.pagination.limit, 10);
  TestValidator.predicate(
    "explicit data size respects limit",
    explicitPage.data.length <= 10,
  );
  TestValidator.equals(
    "total records consistent with default",
    explicitPage.pagination.records,
    defaultPage.pagination.records,
  );
  TestValidator.predicate(
    "pages calculation correct",
    explicitPage.pagination.pages ===
      Math.ceil(explicitPage.pagination.records / 10) ||
      (explicitPage.pagination.records === 0 &&
        explicitPage.pagination.pages === 0),
  );
  // 4. Test Case 3: Page beyond available data (should return empty data)
  const highPageNumber = Math.max(explicitPage.pagination.pages + 1, 999);
  const beyondPage = await api.functional.multiUserTodo.member.view_stats.index(
    memberConnection,
    {
      body: {
        page: highPageNumber satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IMultiUserTodoTodoViewStat.IRequest,
    },
  );
  typia.assert(beyondPage);
  // Validate beyond-page behavior
  TestValidator.equals(
    "beyond-page current",
    beyondPage.pagination.current,
    highPageNumber,
  );
  TestValidator.equals("beyond-page limit", beyondPage.pagination.limit, 5);
  TestValidator.equals(
    "beyond-page total records unchanged",
    beyondPage.pagination.records,
    explicitPage.pagination.records,
  );
  TestValidator.equals("beyond-page data empty", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond-page pages calculation",
    beyondPage.pagination.pages ===
      Math.ceil(beyondPage.pagination.records / 5) ||
      (beyondPage.pagination.records === 0 &&
        beyondPage.pagination.pages === 0),
  );
  // 5. Verify data isolation to member
  if (explicitPage.data.length > 0) {
    for (const stat of explicitPage.data) {
      TestValidator.equals(
        "view stat belongs to authenticated member",
        stat.member.id,
        member.id,
      );
    }
  }
  // 6. Test page navigation (if multiple pages exist)
  if (explicitPage.pagination.pages >= 2) {
    // Get first page records
    const firstPage =
      await api.functional.multiUserTodo.member.view_stats.index(
        memberConnection,
        {
          body: {
            page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: Math.min(explicitPage.pagination.limit, 5) satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IMultiUserTodoTodoViewStat.IRequest,
        },
      );
    typia.assert(firstPage);
    // Get second page records
    const secondPage =
      await api.functional.multiUserTodo.member.view_stats.index(
        memberConnection,
        {
          body: {
            page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: Math.min(explicitPage.pagination.limit, 5) satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IMultiUserTodoTodoViewStat.IRequest,
        },
      );
    typia.assert(secondPage);
    // Verify different records between pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstPageIds = firstPage.data.map((stat) => stat.id);
      const secondPageIds = secondPage.data.map((stat) => stat.id);
      const intersection = firstPageIds.filter((id) =>
        secondPageIds.includes(id),
      );
      TestValidator.equals(
        "no duplicate records across pages",
        intersection.length,
        0,
      );
    }
  }
  // 7. Test last page behavior (if data exists)
  if (
    explicitPage.pagination.records > 0 &&
    explicitPage.pagination.pages > 0
  ) {
    const lastPage = await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {
          page: explicitPage.pagination.pages satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: explicitPage.pagination.limit satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current",
      lastPage.pagination.current,
      explicitPage.pagination.pages,
    );
    TestValidator.predicate(
      "last page data size <= limit",
      lastPage.data.length <= lastPage.pagination.limit,
    );
    TestValidator.predicate(
      "last page has data (unless empty result)",
      lastPage.data.length > 0 || explicitPage.pagination.records === 0,
    );
  }
}
