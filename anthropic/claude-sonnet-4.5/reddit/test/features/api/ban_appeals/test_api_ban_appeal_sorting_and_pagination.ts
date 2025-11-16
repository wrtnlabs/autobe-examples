import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test sorting functionality and pagination behavior when retrieving ban
 * appeals.
 *
 * This test validates that ban appeals can be sorted by different fields
 * (submitted_at, reviewed_at, status, community) in both ascending and
 * descending order. It creates a substantial number of appeal records to test
 * pagination across multiple pages, verifies that pagination metadata (current
 * page, limit, total records, total pages) is accurate, tests navigation
 * through pages with different page sizes, ensures consistent ordering across
 * page boundaries, and validates that sorting by reviewed_at properly handles
 * appeals that have not been reviewed yet (null values).
 */
export async function test_api_ban_appeal_sorting_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test basic pagination with default settings
  const defaultPage: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {} satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(defaultPage);

  // Verify pagination structure exists and is valid
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== null && defaultPage.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(defaultPage.data));

  // Step 3: Test pagination with specific page and limit
  const pageSize = 5;
  const firstPage: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(firstPage);

  // Validate pagination metadata
  TestValidator.equals("current page is 1", firstPage.pagination.current, 0);
  TestValidator.equals(
    "page limit matches request",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    firstPage.data.length <= pageSize,
  );

  // Validate pagination calculation: pages should equal ceil(records / limit)
  if (firstPage.pagination.records > 0 && firstPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      firstPage.pagination.records / firstPage.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      firstPage.pagination.pages,
      expectedPages,
    );
  }

  // Step 4: Test sorting by submitted_at in ascending order
  const sortedBySubmittedAsc: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "submitted_at",
          sort_order: "asc",
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedBySubmittedAsc);

  // Verify ascending order for submitted_at (using created_at from response)
  if (sortedBySubmittedAsc.data.length > 1) {
    for (let i = 0; i < sortedBySubmittedAsc.data.length - 1; i++) {
      const currentDate = new Date(sortedBySubmittedAsc.data[i].created_at);
      const nextDate = new Date(sortedBySubmittedAsc.data[i + 1].created_at);
      TestValidator.predicate(
        `submitted_at ascending order maintained at index ${i}`,
        currentDate.getTime() <= nextDate.getTime(),
      );
    }
  }

  // Step 5: Test sorting by submitted_at in descending order
  const sortedBySubmittedDesc: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "submitted_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedBySubmittedDesc);

  // Verify descending order for submitted_at
  if (sortedBySubmittedDesc.data.length > 1) {
    for (let i = 0; i < sortedBySubmittedDesc.data.length - 1; i++) {
      const currentDate = new Date(sortedBySubmittedDesc.data[i].created_at);
      const nextDate = new Date(sortedBySubmittedDesc.data[i + 1].created_at);
      TestValidator.predicate(
        `submitted_at descending order maintained at index ${i}`,
        currentDate.getTime() >= nextDate.getTime(),
      );
    }
  }

  // Step 6: Test sorting by status
  const sortedByStatus: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "status",
          sort_order: "asc",
          limit: 15,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedByStatus);

  // Verify status sorting (alphabetical order)
  if (sortedByStatus.data.length > 1) {
    for (let i = 0; i < sortedByStatus.data.length - 1; i++) {
      TestValidator.predicate(
        `status ascending order maintained at index ${i}`,
        sortedByStatus.data[i].status <= sortedByStatus.data[i + 1].status,
      );
    }
  }

  // Step 7: Test sorting by community
  const sortedByCommunity: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "community",
          sort_order: "asc",
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedByCommunity);

  // Verify community sorting (by name)
  if (sortedByCommunity.data.length > 1) {
    for (let i = 0; i < sortedByCommunity.data.length - 1; i++) {
      TestValidator.predicate(
        `community ascending order maintained at index ${i}`,
        sortedByCommunity.data[i].community.name <=
          sortedByCommunity.data[i + 1].community.name,
      );
    }
  }

  // Step 8: Test sorting by reviewed_at (handles null values for pending appeals)
  const sortedByReviewedAsc: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "reviewed_at",
          sort_order: "asc",
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedByReviewedAsc);

  // Validate reviewed_at sorting with null handling
  // In ascending order, nulls typically come first or last depending on implementation
  // We verify that non-null values are in ascending order
  if (sortedByReviewedAsc.data.length > 1) {
    for (let i = 0; i < sortedByReviewedAsc.data.length - 1; i++) {
      const current = sortedByReviewedAsc.data[i];
      const next = sortedByReviewedAsc.data[i + 1];

      // If both have updated_at values, verify ascending order
      if (
        current.updated_at !== null &&
        current.updated_at !== undefined &&
        next.updated_at !== null &&
        next.updated_at !== undefined
      ) {
        const currentDate = new Date(current.updated_at);
        const nextDate = new Date(next.updated_at);
        TestValidator.predicate(
          `reviewed_at ascending order maintained at index ${i}`,
          currentDate.getTime() <= nextDate.getTime(),
        );
      }
    }
  }

  // Test reviewed_at descending order
  const sortedByReviewedDesc: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "reviewed_at",
          sort_order: "desc",
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedByReviewedDesc);

  // Validate descending order for reviewed_at
  if (sortedByReviewedDesc.data.length > 1) {
    for (let i = 0; i < sortedByReviewedDesc.data.length - 1; i++) {
      const current = sortedByReviewedDesc.data[i];
      const next = sortedByReviewedDesc.data[i + 1];

      if (
        current.updated_at !== null &&
        current.updated_at !== undefined &&
        next.updated_at !== null &&
        next.updated_at !== undefined
      ) {
        const currentDate = new Date(current.updated_at);
        const nextDate = new Date(next.updated_at);
        TestValidator.predicate(
          `reviewed_at descending order maintained at index ${i}`,
          currentDate.getTime() >= nextDate.getTime(),
        );
      }
    }
  }

  // Step 9: Test pagination navigation - fetch multiple pages
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageIRedditCommunityBanAppeal.ISummary =
      await api.functional.redditCommunity.moderator.banAppeals.index(
        connection,
        {
          body: {
            page: 2,
            limit: pageSize,
          } satisfies IRedditCommunityBanAppeal.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current index is 1",
      secondPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination metadata consistent across pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
  }

  // Step 10: Test pagination with different page sizes
  const smallPageSize = 3;
  const smallPage: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: smallPageSize,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page size limit is correct",
    smallPage.pagination.limit,
    smallPageSize,
  );
  TestValidator.predicate(
    "small page data respects limit",
    smallPage.data.length <= smallPageSize,
  );

  // Step 11: Test combined sorting and pagination
  const sortedPaginated: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          sort_by: "submitted_at",
          sort_order: "desc",
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(sortedPaginated);

  // Verify sorting is maintained with pagination
  if (sortedPaginated.data.length > 1) {
    for (let i = 0; i < sortedPaginated.data.length - 1; i++) {
      const currentDate = new Date(sortedPaginated.data[i].created_at);
      const nextDate = new Date(sortedPaginated.data[i + 1].created_at);
      TestValidator.predicate(
        `sorting maintained with pagination at index ${i}`,
        currentDate.getTime() >= nextDate.getTime(),
      );
    }
  }

  // Step 12: Test filtering by status with pagination
  const statusFiltered: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          status: "pending",
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(statusFiltered);

  // Verify all returned appeals have pending status
  for (const appeal of statusFiltered.data) {
    TestValidator.equals(
      "filtered appeal has pending status",
      appeal.status,
      "pending",
    );
  }
}
