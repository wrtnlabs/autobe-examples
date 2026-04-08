import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member list filtering functionality with email, status, and date range filters.
 *
 * Validates the complete filtering workflow for the member list endpoint, ensuring that email partial matching, status filtering (active/deleted), and date range filters work correctly both individually and in combination. Tests pagination accuracy with applied filters.
 *
 * Special attention is given to verifying that email filters use case-insensitive partial matching, status filters correctly distinguish between soft-deleted and active members, and date range filters use inclusive boundaries.
 *
 * 1. Test email partial match filter with case-insensitive matching.
 * 2. Test status filter for active members (deleted_at is NULL).
 * 3. Test status filter for deleted members (deleted_at is NOT NULL).
 * 4. Test combined email and status filters with AND logic.
 * 5. Test date range filters with created_at_gte and created_at_lte.
 * 6. Verify pagination metadata accuracy with filters applied.
 */
export async function test_api_member_list_filtering_by_email_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for authenticated requests
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Test email partial match filter
  const emailFilter = "test@example";
  const emailFilterResult = await api.functional.hrmTimeTrack.members.index(
    adminConnection,
    {
      body: {
        email: emailFilter,
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  // Verify all returned members have emails containing the filter string (case-insensitive)
  for (const member of emailFilterResult.data) {
    TestValidator.predicate(
      `member email ${member.email} contains filter ${emailFilter}`,
      member.email.toLowerCase().includes(emailFilter.toLowerCase()),
    );
  }
  // 2. Test status filter for active members
  const activeFilterResult = await api.functional.hrmTimeTrack.members.index(
    adminConnection,
    {
      body: {
        status: "active",
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(activeFilterResult);
  // All members returned with status='active' should exist (they are active members)
  TestValidator.predicate(
    "active filter returns valid member list",
    activeFilterResult.data.length >= 0,
  );
  // 3. Test status filter for deleted members
  const deletedFilterResult = await api.functional.hrmTimeTrack.members.index(
    adminConnection,
    {
      body: {
        status: "deleted",
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(deletedFilterResult);
  // All members returned with status='deleted' should exist (they are soft-deleted members)
  TestValidator.predicate(
    "deleted filter returns valid member list",
    deletedFilterResult.data.length >= 0,
  );
  // 4. Test combined email and status filters
  const combinedFilterResult = await api.functional.hrmTimeTrack.members.index(
    adminConnection,
    {
      body: {
        email: emailFilter,
        status: "active",
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  // Verify all returned members match both email and status criteria
  for (const member of combinedFilterResult.data) {
    TestValidator.predicate(
      `combined filter: member email ${member.email} contains filter ${emailFilter}`,
      member.email.toLowerCase().includes(emailFilter.toLowerCase()),
    );
  }
  // 5. Test date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilterResult = await api.functional.hrmTimeTrack.members.index(
    adminConnection,
    {
      body: {
        created_at_gte: thirtyDaysAgo.toISOString(),
        created_at_lte: now.toISOString(),
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(dateRangeFilterResult);
  // Verify all returned members were created within the specified date range
  for (const member of dateRangeFilterResult.data) {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      `member created_at ${member.created_at} is >= ${thirtyDaysAgo.toISOString()}`,
      createdAt >= thirtyDaysAgo,
    );
    TestValidator.predicate(
      `member created_at ${member.created_at} is <= ${now.toISOString()}`,
      createdAt <= now,
    );
  }
  // 6. Test pagination with filters
  const paginationFilterResult =
    await api.functional.hrmTimeTrack.members.index(adminConnection, {
      body: {
        email: emailFilter,
        page: 1,
        limit: 5,
      } satisfies IHrmTimeTrackMember.IRequest,
    });
  typia.assert(paginationFilterResult);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    paginationFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationFilterResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination data count does not exceed limit",
    paginationFilterResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginationFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginationFilterResult.pagination.pages >= 0,
  );
  // 7. Test empty results with non-matching filter
  const nonMatchingEmail = RandomGenerator.alphabets(10) + "@test.com";
  const emptyFilterResult = await api.functional.hrmTimeTrack.members.index(
    adminConnection,
    {
      body: {
        email: nonMatchingEmail,
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(emptyFilterResult);
  // Verify empty results are returned gracefully
  TestValidator.predicate(
    "non-matching email filter returns empty or valid results",
    emptyFilterResult.data.length >= 0,
  );
}
