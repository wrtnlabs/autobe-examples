import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test pagination navigation for karma history records.
 *
 * This test validates that members can efficiently navigate through paginated
 * karma history datasets using custom page numbers and limits. It verifies:
 *
 * 1. Member account creation and authentication setup
 * 2. Pagination metadata accuracy (page number, limit, total records, total pages)
 * 3. Correct record distribution across multiple pages without duplication
 * 4. Graceful handling when requesting pages beyond available data
 * 5. Consistent pagination behavior with filters and sorting
 *
 * The test navigates through the complete karma history dataset, validating
 * that pagination controls effectively manage large datasets and provide
 * accurate navigation information.
 */
export async function test_api_karma_history_member_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const memberUsername = RandomGenerator.alphabets(8);

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Query karma history with pagination - first page with default limit
  const firstPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(firstPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    firstPage.pagination !== undefined && firstPage.pagination !== null,
  );
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit matches request",
    firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Step 3: Test navigation with different page and limit combinations
  if (firstPage.pagination.pages > 1) {
    // Test with limit of 5
    const secondPage: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.predicate(
      "second page current page is 2",
      secondPage.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page limit is 5",
      secondPage.pagination.limit === 5,
    );
    TestValidator.predicate(
      "second page has same total records",
      secondPage.pagination.records === firstPage.pagination.records,
    );
  }

  // Step 4: Test with different limit values within range
  const pageSizeVariations: Array<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  > = [1, 10, 25, 50, 100];

  for (const limit of pageSizeVariations) {
    const pagedResult: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.member.karmaHistory.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(pagedResult);

    TestValidator.predicate(
      `pagination with limit ${limit} has correct metadata`,
      pagedResult.pagination.limit === limit,
    );

    // Verify server-provided pages value is consistent with expected calculation
    TestValidator.predicate(
      `pages metadata is valid for limit ${limit}`,
      pagedResult.pagination.pages >=
        Math.floor(pagedResult.pagination.records / limit),
    );
  }

  // Step 5: Test requesting page beyond available data
  const beyondPageResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(beyondPageResult);

  // Beyond page should return empty result set gracefully
  TestValidator.predicate(
    "page beyond total returns valid response",
    Array.isArray(beyondPageResult.data),
  );
  TestValidator.predicate(
    "page beyond total returns empty data",
    beyondPageResult.data.length === 0,
  );

  // Step 6: Test pagination with different limits to validate record distribution
  const testLimit1: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          limit: 7,
          page: 1,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(testLimit1);

  const testLimit2: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          limit: 13,
          page: 1,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(testLimit2);

  // Both should have same total records
  TestValidator.equals(
    "total records consistent across different limits",
    testLimit1.pagination.records,
    testLimit2.pagination.records,
  );

  // Step 7: Validate data array length matches pagination logic
  const dataValidation: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(dataValidation);

  // Data length should not exceed limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    dataValidation.data.length <= dataValidation.pagination.limit,
  );

  // For pages before the last page, data length should match limit
  if (dataValidation.pagination.current < dataValidation.pagination.pages) {
    TestValidator.equals(
      "data length matches limit for non-final pages",
      dataValidation.data.length,
      dataValidation.pagination.limit,
    );
  }

  // Step 8: Test pagination consistency with sorting
  const sortedPageFirst: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at_desc",
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedPageFirst);

  const sortedPageSecond: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          sort_by: "created_at_desc",
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedPageSecond);

  // Pagination metadata should be consistent
  TestValidator.equals(
    "total records same with sorting",
    sortedPageFirst.pagination.records,
    sortedPageSecond.pagination.records,
  );

  // Step 9: Validate no record duplication across pages
  if (sortedPageFirst.data.length > 0 && sortedPageSecond.data.length > 0) {
    const firstPageIds = sortedPageFirst.data.map((record) => record.id);
    const secondPageIds = sortedPageSecond.data.map((record) => record.id);

    // Check for no overlapping IDs between consecutive pages
    const duplicateIds = firstPageIds.filter((id) =>
      secondPageIds.includes(id),
    );
    TestValidator.predicate(
      "no duplicate records between consecutive pages",
      duplicateIds.length === 0,
    );
  }

  // Step 10: Test sequential page navigation through available pages
  if (testLimit1.pagination.pages > 0) {
    const pageCount = Math.min(testLimit1.pagination.pages, 3); // Test up to 3 pages
    let previousPageIds: string[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const pageData: IPageICommunityPlatformKarmaHistory =
        await api.functional.communityPlatform.member.karmaHistory.index(
          connection,
          {
            body: {
              page: pageNum,
              limit: 15,
            } satisfies ICommunityPlatformKarmaHistory.IRequest,
          },
        );
      typia.assert(pageData);

      TestValidator.predicate(
        `sequential navigation page ${pageNum} has correct current page`,
        pageData.pagination.current === pageNum,
      );

      const currentPageIds = pageData.data.map((record) => record.id);

      // Verify no overlap with previous page
      if (previousPageIds.length > 0) {
        const overlap = currentPageIds.filter((id) =>
          previousPageIds.includes(id),
        );
        TestValidator.predicate(
          `sequential navigation page ${pageNum} has no overlap with previous page`,
          overlap.length === 0,
        );
      }

      previousPageIds = currentPageIds;
    }
  }
}
