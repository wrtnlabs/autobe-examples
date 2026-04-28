import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test cursor-based pagination for the member listing endpoint.
 *
 * Validates page-based pagination behavior for PATCH /hrmPlatform/members, verifying that consecutive pages return distinct member records and that pagination metadata accurately reflects total record counts and computed page totals.
 *
 * Special attention is given to confirming that pages equals Math.ceil(records divided by limit), and that requesting a page far beyond available data returns an empty array with stable metadata reflecting actual system totals.
 *
 * 1. Fetch page 1 with limit of 4 members.
 * 2. Fetch page 2 with the same limit and verify no overlap.
 * 3. Fetch a page far beyond total pages and validate empty results.
 * 4. Assert pagination metadata: current, limit, records, pages calculated correctly.
 */
export async function test_api_member_pagination_cursor(
  connection: api.IConnection,
) {
  // 1. Fetch page 1 with small limit
  const bodyPage1 = { page: 1, limit: 4 } satisfies IHrmPlatformMember.IRequest;
  const page1 = await api.functional.hrmPlatform.members.index(connection, {
    body: bodyPage1,
  });
  typia.assert(page1);
  // 2. Fetch page 2 with same limit
  const bodyPage2 = { page: 2, limit: 4 } satisfies IHrmPlatformMember.IRequest;
  const page2 = await api.functional.hrmPlatform.members.index(connection, {
    body: bodyPage2,
  });
  typia.assert(page2);
  // 3. Fetch page far beyond total pages to verify empty result
  const totalMembers = page1.pagination.records;
  const farOffPage = totalMembers > 0 ? page1.pagination.pages + 1 : 2;
  const bodyFar = {
    page: farOffPage,
    limit: 4,
  } satisfies IHrmPlatformMember.IRequest;
  const pageFar = await api.functional.hrmPlatform.members.index(connection, {
    body: bodyFar,
  });
  typia.assert(pageFar);
  // 4. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    4,
  );
  TestValidator.predicate(
    "page 1 has valid records count",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has valid pages count",
    page1.pagination.pages >= 0,
  );
  // 5. Validate pagination metadata for page 2
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  // 6. Validate records count is consistent across pages
  TestValidator.equals(
    "total records consistent across pages",
    page2.pagination.records,
    page1.pagination.records,
  );
  // 7. Validate pages calculation
  const expectedPages = totalMembers > 0 ? Math.ceil(totalMembers / 4) : 0;
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    page1.pagination.pages,
    expectedPages,
  );
  // 8. Verify page 2 returns different records than page 1
  const emailsPage1 = new Set(page1.data.map((m) => m.email));
  TestValidator.equals(
    "page 2 contains no records from page 1",
    page2.data.filter((m) => emailsPage1.has(m.email)).length,
    0,
  );
  // 9. Verify beyond-boundary page returns empty data
  TestValidator.equals(
    "page beyond total returns empty data",
    pageFar.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond boundary page has valid current",
    pageFar.pagination.current >= farOffPage || pageFar.pagination.current > 0,
  );
  // 10. Verify results ordered by created_at descending
  if (page1.data.length > 1) {
    const firstCreated = new Date(page1.data[0].created_at).getTime();
    const lastCreated = new Date(
      page1.data[page1.data.length - 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "page 1 records ordered by created_at descending",
      firstCreated >= lastCreated,
    );
  }
}
