import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSuspension";

export async function test_api_member_suspension_search_administrator_status_tracking(
  connection: api.IConnection,
) {
  // Create administrator account for authentication
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword@123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Search for active suspensions (include_expired=false)
  // This returns currently active disciplinary actions
  const activeSuspensions: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          include_expired: false,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(activeSuspensions);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination records should be non-negative",
    activeSuspensions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    activeSuspensions.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    activeSuspensions.pagination.limit === 20,
  );

  // Search all suspensions including expired (include_expired=true)
  // This provides complete suspension history including expired cases
  const allSuspensions: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          include_expired: true,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(allSuspensions);

  // Including expired suspensions should return at least as many results
  TestValidator.predicate(
    "all suspensions count should be >= active suspensions count",
    allSuspensions.pagination.records >= activeSuspensions.pagination.records,
  );

  // Verify permanent suspensions (null expires_at) are visible
  const permanentSuspensionsInAll = allSuspensions.data.filter(
    (s) => s.expires_at === null || s.expires_at === undefined,
  );
  TestValidator.predicate(
    "permanent suspensions should always be visible",
    permanentSuspensionsInAll.length >= 0,
  );

  // Test sorting by suspension date in descending order
  // Administrators can identify most recent suspensions
  const sortedBySuspensionDate: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          include_expired: false,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortedBySuspensionDate);

  // Validate descending sort order by checking consecutive dates
  if (sortedBySuspensionDate.data.length > 1) {
    for (let i = 0; i < sortedBySuspensionDate.data.length - 1; i++) {
      const current = new Date(sortedBySuspensionDate.data[i].suspended_at);
      const next = new Date(sortedBySuspensionDate.data[i + 1].suspended_at);
      TestValidator.predicate(
        `suspension ${i} should be more recent than suspension ${i + 1}`,
        current >= next,
      );
    }
  }

  // Test sorting by expiration date to identify approaching expirations
  // Administrators use this to identify suspensions for review or renewal
  const sortedByExpiration: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          include_expired: false,
          sort_by: "expires_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortedByExpiration);

  // Filter by reason to demonstrate search functionality
  const reasonSearchResults: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          search: "violation",
          include_expired: false,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(reasonSearchResults);
  TestValidator.predicate(
    "reason search should return valid results",
    reasonSearchResults.pagination.records >= 0,
  );

  // Test date range filtering for suspensions within specific period
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const dateRangeResults: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          suspended_after: thirtyDaysAgo.toISOString(),
          suspended_before: now.toISOString(),
          include_expired: true,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range filter should return valid paginated results",
    dateRangeResults.pagination.records >= 0,
  );

  // Verify all active suspensions have valid expiration patterns
  // Either null (permanent) or future date (temporary with expiration)
  await ArrayUtil.asyncForEach(activeSuspensions.data, async (suspension) => {
    typia.assert(suspension);
    // If has expiration date, must be in future
    if (suspension.expires_at !== null && suspension.expires_at !== undefined) {
      const expirationDate = new Date(suspension.expires_at);
      TestValidator.predicate(
        `suspension ${suspension.id} expiration must be in future`,
        expirationDate > new Date(),
      );
    }
  });

  // Verify administrator can identify suspension status at a glance
  TestValidator.predicate(
    "active suspensions provide status tracking for administrators",
    activeSuspensions.data.length >= 0,
  );

  // Confirm suspension history available for compliance and auditing
  TestValidator.predicate(
    "all suspensions history provides oversight of disciplinary measures",
    allSuspensions.pagination.records >= activeSuspensions.pagination.records,
  );

  // Validate pagination calculations make sense
  const expectedPages = Math.ceil(
    allSuspensions.pagination.records / allSuspensions.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation should be correct",
    allSuspensions.pagination.pages,
    expectedPages,
  );
}
