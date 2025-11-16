import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSuspension";

/**
 * Test administrator member suspension search and filtering capabilities.
 *
 * Validates that administrators can comprehensively search and filter member
 * suspensions with multiple criteria including member identity, suspension
 * reason (full-text search), temporal ranges, and active/expired status. Tests
 * pagination with various page sizes, sorting by multiple fields in both
 * directions, and the include_expired flag functionality.
 *
 * Steps:
 *
 * 1. Create administrator account with authentication
 * 2. Test pagination with different page sizes and limits
 * 3. Test filtering by member username and member ID
 * 4. Test date range filtering for suspension and expiration dates
 * 5. Test full-text search on suspension reason field
 * 6. Test active/expired status filtering with include_expired flag
 * 7. Test sorting by different fields and directions
 * 8. Verify pagination metadata and data integrity
 */
export async function test_api_member_suspension_search_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test basic pagination with default parameters
  const defaultSearch =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(defaultSearch);

  // Step 3: Test pagination with custom page and limit
  const customPaginationSearch =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(customPaginationSearch);
  TestValidator.equals(
    "requested page should match",
    customPaginationSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should match",
    customPaginationSearch.pagination.limit,
    10,
  );

  // Step 4: Test maximum limit boundary
  const maxLimitSearch =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "maximum limit should be enforced at or below 100",
    maxLimitSearch.pagination.limit <= 100,
  );

  // Step 5: Test search with full-text search on reason
  const searchWithReason =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          search: "spam",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(searchWithReason);

  // Step 6: Test filtering by member username
  const searchByUsername =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          member_username: "testuser",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(searchByUsername);

  // Step 7: Test filtering by member ID
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const searchByMemberId =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          member_id: memberId,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(searchByMemberId);

  // Step 8: Test date range filtering for suspension dates
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const searchByDateRange =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: thirtyDaysAgo.toISOString(),
          suspended_before: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(searchByDateRange);

  // Step 9: Test expiration date range filtering
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const searchByExpirationRange =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          expires_after: now.toISOString(),
          expires_before: futureDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(searchByExpirationRange);

  // Step 10: Test include_expired flag for active suspensions only
  const activeOnly =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          include_expired: false,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(activeOnly);

  // Step 11: Test include_expired flag for all suspensions
  const allSuspensions =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          include_expired: true,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(allSuspensions);

  // Step 12: Test sorting by suspended_at descending (default)
  const sortBySuspendedDesc =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortBySuspendedDesc);

  // Step 13: Test sorting by suspended_at ascending
  const sortBySuspendedAsc =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortBySuspendedAsc);

  // Step 14: Test sorting by expires_at
  const sortByExpiresAt =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByExpiresAt);

  // Step 15: Test sorting by reason
  const sortByReason =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "reason",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByReason);

  // Step 16: Test sorting by member_username
  const sortByUsername =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "member_username",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByUsername);

  // Step 17: Test combined filters with search, pagination, and sorting
  const combinedSearch =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          search: "violation",
          member_username: "user123",
          suspended_after: thirtyDaysAgo.toISOString(),
          include_expired: false,
          sort_by: "suspended_at",
          sort_order: "desc",
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined filters should apply requested limit",
    combinedSearch.pagination.limit,
    15,
  );
  TestValidator.predicate(
    "pagination current page should be correct",
    combinedSearch.pagination.current === 1,
  );

  // Step 18: Test empty result handling
  const emptySearch =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          member_id: "00000000-0000-0000-0000-000000000000",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "search results should be array",
    Array.isArray(emptySearch.data),
  );
}
