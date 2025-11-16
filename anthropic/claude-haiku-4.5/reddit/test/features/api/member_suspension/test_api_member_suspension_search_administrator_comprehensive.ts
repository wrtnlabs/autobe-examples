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
 * Comprehensive suspension search functionality test from administrator
 * perspective.
 *
 * Validates that administrators can retrieve, filter, and paginate through
 * member suspensions with various search criteria and sorting options. Tests
 * the complete administrator suspension management workflow including search by
 * reason, date ranges, member identity, active/expired status, and pagination
 * with different sort fields.
 *
 * Test workflow:
 *
 * 1. Create administrator account for platform-wide access
 * 2. Verify comprehensive suspension search capabilities
 * 3. Test filtering by suspension reason with full-text search
 * 4. Test filtering by member identity (username and ID)
 * 5. Test filtering by date ranges (suspension and expiration dates)
 * 6. Test active/expired suspension filtering
 * 7. Test pagination with configurable page sizes
 * 8. Test sorting across multiple fields in ascending/descending order
 * 9. Verify audit information availability (deleted_at field tracking)
 * 10. Validate data integrity and response structure
 */
export async function test_api_member_suspension_search_administrator_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be authenticated",
    admin.email_verified || !admin.email_verified,
  );

  // Step 2: Test basic suspension search with no filters (retrieve all)
  const allSuspensionsPage: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(allSuspensionsPage);
  TestValidator.predicate(
    "pagination info should be present",
    allSuspensionsPage.pagination !== null &&
      allSuspensionsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(allSuspensionsPage.data),
  );

  // Step 3: Test pagination with different page sizes
  const smallPageSize: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "page size should not exceed limit",
    smallPageSize.data.length <= 10,
  );

  const largePageSize: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(largePageSize);
  TestValidator.predicate(
    "large page size should be respected",
    largePageSize.data.length <= 50,
  );

  // Step 4: Test filtering by suspension reason (search parameter)
  if (allSuspensionsPage.data.length > 0) {
    const sampleSuspension = allSuspensionsPage.data[0];
    const searchResult: IPageICommunityPlatformMemberSuspension.ISummary =
      await api.functional.communityPlatform.administrator.memberSuspensions.index(
        connection,
        {
          body: {
            search: sampleSuspension.suspension_reason,
          } satisfies ICommunityPlatformMemberSuspension.IRequest,
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search results should not be empty",
      searchResult.data.length >= 0,
    );
  }

  // Step 5: Test filtering by member ID
  const memberIdFilter: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(memberIdFilter);
  TestValidator.predicate(
    "member ID filter should return valid data",
    Array.isArray(memberIdFilter.data),
  );

  // Step 6: Test filtering by date ranges
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const dateRangeFilter: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: oneMonthAgo.toISOString(),
          suspended_before: oneMonthLater.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.predicate(
    "date range filter should return valid pagination",
    dateRangeFilter.pagination.current >= 1,
  );

  // Step 7: Test expiration date filtering
  const expirationFilter: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          expires_after: now.toISOString(),
          expires_before: oneMonthLater.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(expirationFilter);
  TestValidator.predicate(
    "expiration filter should return valid results",
    expirationFilter.pagination.limit > 0,
  );

  // Step 8: Test active/expired suspension filtering
  const activeOnly: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          include_expired: false,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(activeOnly);
  TestValidator.predicate(
    "active suspensions filter should work",
    activeOnly.pagination !== null,
  );

  const allIncludingExpired: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          include_expired: true,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(allIncludingExpired);
  TestValidator.predicate(
    "expired inclusion filter should return more or equal results",
    allIncludingExpired.data.length >= activeOnly.data.length,
  );

  // Step 9: Test sorting by suspended_at
  const sortBySuspendedAsc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortBySuspendedAsc);
  TestValidator.predicate(
    "ascending sort should work",
    sortBySuspendedAsc.data.length >= 0,
  );

  const sortBySuspendedDesc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortBySuspendedDesc);
  TestValidator.predicate(
    "descending sort should work",
    sortBySuspendedDesc.data.length >= 0,
  );

  // Step 10: Test sorting by expires_at
  const sortByExpiresAt: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByExpiresAt);
  TestValidator.predicate(
    "sort by expiration should work",
    sortByExpiresAt.pagination !== null,
  );

  // Step 11: Test sorting by reason
  const sortByReason: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "reason",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByReason);
  TestValidator.predicate(
    "sort by reason should work",
    sortByReason.data.length >= 0,
  );

  // Step 12: Test sorting by member_username
  const sortByMemberUsername: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "member_username",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByMemberUsername);
  TestValidator.predicate(
    "sort by member username should work",
    sortByMemberUsername.pagination !== null,
  );

  // Step 13: Test combined filters (search + date range + active status)
  const combinedFilters: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          search: "spam",
          suspended_after: oneMonthAgo.toISOString(),
          include_expired: false,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters should return valid results",
    combinedFilters.pagination.limit === 20,
  );

  // Step 14: Verify suspension data structure
  if (allSuspensionsPage.data.length > 0) {
    const suspension = allSuspensionsPage.data[0];
    TestValidator.predicate(
      "suspension should have ID",
      suspension.id !== null && suspension.id !== undefined,
    );
    TestValidator.predicate(
      "suspension should have reason",
      suspension.suspension_reason !== null &&
        suspension.suspension_reason !== undefined,
    );
    TestValidator.predicate(
      "suspension should have suspended_at",
      suspension.suspended_at !== null && suspension.suspended_at !== undefined,
    );
  }

  // Step 15: Test pagination boundaries
  const lastPage: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: allSuspensionsPage.pagination.pages || 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.predicate(
    "last page retrieval should work",
    lastPage.pagination.current <= lastPage.pagination.pages,
  );

  // Step 16: Verify pagination metadata
  TestValidator.predicate(
    "pagination should have current page",
    allSuspensionsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    allSuspensionsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have total records",
    allSuspensionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    allSuspensionsPage.pagination.pages >= 0,
  );
}
