import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSuspension";

/**
 * Test member suspension search and filtering by moderator.
 *
 * Validates that moderators can search and filter member suspensions with
 * various criteria including username, ID, date ranges, status, and text
 * search. Tests pagination with different page sizes and sorting by multiple
 * fields in both ascending and descending order.
 *
 * Workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Test basic suspension search without filters
 * 3. Test pagination with different limits and pages
 * 4. Test filtering by member username
 * 5. Test filtering by member ID
 * 6. Test filtering by suspension date ranges
 * 7. Test filtering by expiration date ranges
 * 8. Test include_expired flag for excluding/including expired suspensions
 * 9. Test full-text search on suspension reason
 * 10. Test sorting by different fields and directions
 * 11. Validate response structure and data integrity
 */
export async function test_api_member_suspension_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorCreationData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreationData,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should have valid ID",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Step 2: Test basic suspension search without filters
  const basicSearchResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(basicSearchResult);
  TestValidator.predicate(
    "pagination exists",
    basicSearchResult.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(basicSearchResult.data),
  );

  // Step 3: Test pagination with different limits
  const pageSize5Result: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(pageSize5Result);
  TestValidator.predicate(
    "page size 5 result has correct limit",
    pageSize5Result.pagination.limit === 5,
  );

  const pageSize20Result: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(pageSize20Result);
  TestValidator.predicate(
    "page size 20 result has correct limit",
    pageSize20Result.pagination.limit === 20,
  );

  // Step 4: Test filtering by member username
  const testUsername = RandomGenerator.alphabets(8);
  const usernameFilterResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          member_username: testUsername,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(usernameFilterResult);

  // Step 5: Test filtering by member ID
  const testMemberId = typia.random<string & tags.Format<"uuid">>();
  const memberIdFilterResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          member_id: testMemberId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(memberIdFilterResult);

  // Step 6: Test filtering by suspension date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const suspensionDateRangeResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: thirtyDaysAgo.toISOString(),
          suspended_before: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(suspensionDateRangeResult);

  // Step 7: Test filtering by expiration date ranges
  const expirationDateRangeResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          expires_after: now.toISOString(),
          expires_before: fifteenDaysFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(expirationDateRangeResult);

  // Step 8: Test include_expired flag - exclude expired (default)
  const activeOnlyResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          include_expired: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(activeOnlyResult);

  // Step 8b: Test include_expired flag - include expired
  const allSuspensionsResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          include_expired: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(allSuspensionsResult);

  // Step 9: Test full-text search on suspension reason
  const searchQuery = RandomGenerator.substring(RandomGenerator.content());
  const textSearchResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          search: searchQuery,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(textSearchResult);

  // Step 10: Test sorting by suspended_at (default)
  const sortBySuspendedAtDescResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortBySuspendedAtDescResult);

  const sortBySuspendedAtAscResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortBySuspendedAtAscResult);

  // Step 10b: Test sorting by expires_at
  const sortByExpiresAtResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByExpiresAtResult);

  // Step 10c: Test sorting by reason
  const sortByReasonResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "reason",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByReasonResult);

  // Step 10d: Test sorting by member_username
  const sortByMemberUsernameResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "member_username",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByMemberUsernameResult);

  // Step 11: Validate response structure and data integrity
  TestValidator.predicate(
    "pagination has current page",
    basicSearchResult.pagination.current !== null &&
      basicSearchResult.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearchResult.pagination.limit !== null &&
      basicSearchResult.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has total records",
    basicSearchResult.pagination.records !== null &&
      basicSearchResult.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has total pages",
    basicSearchResult.pagination.pages !== null &&
      basicSearchResult.pagination.pages !== undefined,
  );

  // Validate each suspension summary in data array
  if (basicSearchResult.data.length > 0) {
    const firstSuspension = basicSearchResult.data[0];
    typia.assert(firstSuspension);
    TestValidator.predicate(
      "suspension has valid ID",
      firstSuspension.id !== null && firstSuspension.id !== undefined,
    );
    TestValidator.predicate(
      "suspension has reason",
      firstSuspension.suspension_reason !== null &&
        firstSuspension.suspension_reason !== undefined,
    );
    TestValidator.predicate(
      "suspension has suspended_at timestamp",
      firstSuspension.suspended_at !== null &&
        firstSuspension.suspended_at !== undefined,
    );
  }

  // Test combined filters
  const combinedFilterResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          member_username: testUsername,
          suspended_after: thirtyDaysAgo.toISOString(),
          include_expired: false,
          sort_by: "suspended_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  TestValidator.predicate(
    "combined filter search succeeds",
    combinedFilterResult !== null && combinedFilterResult !== undefined,
  );
}
