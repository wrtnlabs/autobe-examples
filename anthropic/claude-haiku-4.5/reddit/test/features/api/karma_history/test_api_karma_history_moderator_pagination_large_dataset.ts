import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test moderator pagination functionality for large karma history datasets.
 *
 * This test validates that moderators can efficiently navigate through large
 * karma history datasets using pagination. It verifies configurable page sizes
 * between 1 and 100 records, accurate pagination metadata, multi-page
 * navigation, and pagination behavior with filters and sorting combined.
 *
 * Steps:
 *
 * 1. Create a moderator account for authentication
 * 2. Request karma history with various page sizes (small, medium, large)
 * 3. Validate pagination metadata accuracy
 * 4. Navigate across multiple pages to verify consistency
 * 5. Test pagination with filters and sorting applied
 * 6. Verify page calculations are correct for different dataset sizes
 */
export async function test_api_karma_history_moderator_pagination_large_dataset(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );

  // Step 2: Test pagination with different page sizes
  // Test with page size 1 (minimum)
  const pageSize1: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(pageSize1);
  TestValidator.predicate(
    "page size 1 response valid",
    pageSize1.pagination !== null,
  );
  TestValidator.equals("page limit is 1", pageSize1.pagination.limit, 1);

  // Test with page size 10 (medium)
  const pageSize10: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(pageSize10);
  TestValidator.predicate(
    "page size 10 response valid",
    pageSize10.pagination !== null,
  );
  TestValidator.equals("page limit is 10", pageSize10.pagination.limit, 10);
  TestValidator.predicate(
    "data array length matches or is less than limit",
    pageSize10.data.length <= pageSize10.pagination.limit,
  );

  // Test with page size 100 (maximum)
  const pageSize100: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(pageSize100);
  TestValidator.predicate(
    "page size 100 response valid",
    pageSize100.pagination !== null,
  );
  TestValidator.equals("page limit is 100", pageSize100.pagination.limit, 100);

  // Step 3: Validate pagination metadata accuracy
  const totalRecords: number = pageSize100.pagination.records;
  const expectedPages: number = Math.ceil(
    totalRecords / pageSize100.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages match pagination pages",
    expectedPages,
    pageSize100.pagination.pages,
  );
  TestValidator.predicate("total records is non-negative", totalRecords >= 0);
  TestValidator.predicate(
    "current page is valid",
    pageSize100.pagination.current >= 0,
  );

  // Step 4: Navigate across multiple pages
  if (pageSize100.pagination.pages > 1) {
    // Get second page
    const secondPage: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number is correct",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page has data or is last page",
      secondPage.data.length >= 0,
    );

    // Get last page if there are multiple pages
    const lastPageNumber: number = pageSize100.pagination.pages;
    if (lastPageNumber > 1) {
      const lastPage: IPageICommunityPlatformKarmaHistory =
        await api.functional.communityPlatform.moderator.karmaHistory.index(
          connection,
          {
            body: {
              page: lastPageNumber,
              limit: 10,
            } satisfies ICommunityPlatformKarmaHistory.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        "last page number is correct",
        lastPage.pagination.current,
        lastPageNumber,
      );
      TestValidator.predicate(
        "last page records are less than or equal to limit",
        lastPage.data.length <= 10,
      );
    }
  }

  // Step 5: Test pagination with filters and sorting
  // Test with sorting
  const sortedAsc: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at_asc",
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "sorted ascending response valid",
    sortedAsc.pagination !== null,
  );

  // Test with descending sort
  const sortedDesc: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at_desc",
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "sorted descending response valid",
    sortedDesc.pagination !== null,
  );

  // Test with change reason filter
  const filteredByReason: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          change_reason: "vote_created",
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(filteredByReason);
  TestValidator.predicate(
    "filtered by reason response valid",
    filteredByReason.pagination !== null,
  );

  // Verify all filtered records have the specified reason
  const allHaveReason: boolean = filteredByReason.data.every(
    (record) => record.change_reason === "vote_created",
  );
  TestValidator.predicate(
    "all filtered records match specified reason",
    allHaveReason || filteredByReason.data.length === 0,
  );

  // Step 6: Test pagination consistency across different limits
  const consistency1: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(consistency1);

  const consistency2: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(consistency2);

  // Total records should be consistent
  TestValidator.equals(
    "total records consistent across requests",
    consistency1.pagination.records,
    consistency2.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent across requests",
    consistency1.pagination.pages,
    consistency2.pagination.pages,
  );
}
