import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussDraftSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussDraftSortBy";
import type { IEEconDiscussSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussSortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";

/**
 * Ensure draft search excludes discarded entries and paginates stably.
 *
 * Workflow:
 *
 * 1. Join as a new member to obtain authorization.
 * 2. Create four drafts (private autosave entries).
 * 3. Discard one draft (soft delete) so it must be excluded from search.
 * 4. Search with page=1, pageSize=2 using default sort (updated_at desc).
 * 5. Fetch page=2 when applicable and combine results.
 * 6. Validate:
 *
 *    - Discarded draft does not appear.
 *    - Ordering is stable by updated_at desc across pages.
 *    - Pagination metadata (records/pages/limit/current) is consistent.
 *    - Timestamps and structures conform to DTOs (via typia.assert).
 * 7. Repeat searches to confirm idempotent, stable ordering across requests.
 */
export async function test_api_drafts_search_excludes_discarded_and_paginates_stably(
  connection: api.IConnection,
) {
  // 1) Join as a new member (SDK will attach auth token automatically)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name(1);

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create four drafts to ensure multi-page results after discarding one
  const draft1 = await api.functional.econDiscuss.member.drafts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    },
  );
  typia.assert(draft1);

  const draft2 = await api.functional.econDiscuss.member.drafts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    },
  );
  typia.assert(draft2);

  const draft3 = await api.functional.econDiscuss.member.drafts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.paragraph({ sentences: 7 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    },
  );
  typia.assert(draft3);

  const draft4 = await api.functional.econDiscuss.member.drafts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.paragraph({ sentences: 9 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    },
  );
  typia.assert(draft4);

  // 3) Discard one draft (soft delete) - exclude from search later
  const discardedId = draft2.id;
  await api.functional.econDiscuss.member.drafts.erase(connection, {
    draftId: discardedId,
  });

  // Prepare expected active set and order by updated_at desc
  const activeDrafts = [draft1, draft3, draft4];
  const expectedOrder = [...activeDrafts].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
  const expectedIds = expectedOrder.map((d) => d.id);

  // 4) Search page 1, pageSize 2 with default sort
  const page1Body = {
    page: 1 as number,
    pageSize: 2 as number,
  } satisfies IEconDiscussPostDraft.IRequest;
  const page1 = await api.functional.econDiscuss.member.drafts.index(
    connection,
    { body: page1Body },
  );
  typia.assert(page1);

  // 5) Fetch page 2 if total pages >= 2
  const totalPages = page1.pagination.pages;
  const needSecondPage = totalPages >= 2;
  const page2 = needSecondPage
    ? await api.functional.econDiscuss.member.drafts.index(connection, {
        body: {
          page: 2 as number,
          pageSize: 2 as number,
        } satisfies IEconDiscussPostDraft.IRequest,
      })
    : undefined;
  if (page2 !== undefined) typia.assert(page2);

  const combined: IEconDiscussPostDraft[] = [
    ...page1.data,
    ...(page2?.data ?? []),
  ];

  // 6-1) Discarded draft must be excluded
  TestValidator.predicate(
    "discarded draft must be excluded from search results",
    combined.some((d) => d.id === discardedId) === false,
  );

  // 6-2) Pagination metadata and counts
  TestValidator.equals(
    "records equals active draft count",
    page1.pagination.records,
    activeDrafts.length,
  );
  const expectedPages = Math.ceil(activeDrafts.length / page1.pagination.limit);
  TestValidator.equals(
    "pages equals ceil(records/limit)",
    page1.pagination.pages,
    expectedPages,
  );
  TestValidator.equals("page1 current is 1", page1.pagination.current, 1);
  if (needSecondPage) {
    TestValidator.equals(
      "page2 current is 2",
      (page2 as IPageIEconDiscussPostDraft).pagination.current,
      2,
    );
  }

  // 6-3) Stable updated_at desc ordering across pages
  const combinedIds = combined.map((d) => d.id);
  // Combined should exactly match expected ids when fetching first two pages
  TestValidator.equals(
    "combined results follow updated_at desc ordering",
    combinedIds,
    expectedIds,
  );
  // Non-increasing updated_at across combined results
  const nonIncreasing = combined.every(
    (d, i, arr) => i === 0 || arr[i - 1].updated_at >= d.updated_at,
  );
  TestValidator.predicate(
    "updated_at must be non-increasing across pagination",
    nonIncreasing,
  );

  // 7) Repeat searches to confirm idempotent, stable ordering across requests
  const page1Again = await api.functional.econDiscuss.member.drafts.index(
    connection,
    { body: page1Body },
  );
  typia.assert(page1Again);
  const page2Again = needSecondPage
    ? await api.functional.econDiscuss.member.drafts.index(connection, {
        body: {
          page: 2 as number,
          pageSize: 2 as number,
        } satisfies IEconDiscussPostDraft.IRequest,
      })
    : undefined;
  if (page2Again !== undefined) typia.assert(page2Again);

  const combinedAgain = [
    ...page1Again.data,
    ...((page2Again as IPageIEconDiscussPostDraft | undefined)?.data ?? []),
  ].map((d) => d.id);

  TestValidator.equals(
    "repeated search returns identical ordering",
    combinedAgain,
    combinedIds,
  );
}
