import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberBan";

/**
 * Test member bans search and filtering with pagination.
 *
 * This test validates the search and filtering capabilities of the ban
 * management system for moderators. It comprehensively tests pagination with
 * various parameters, filtering by ban reason keywords, date ranges, appeal
 * eligibility status, and active/inactive status. The test also validates
 * sorting by different fields (ban_date, member_name, appeal_eligible_date,
 * created_at) in both ascending and descending order, and verifies that
 * pagination information is correct.
 *
 * The test flow:
 *
 * 1. Create moderator account for ban search operations
 * 2. Test pagination with default parameters (page 1, limit 20)
 * 3. Test pagination with custom page and limit values
 * 4. Test maximum allowed limit (100) for large result sets
 * 5. Test filtering by ban reason keywords
 * 6. Test filtering by ban date range
 * 7. Test filtering by appeal eligibility status (true/false/null)
 * 8. Test filtering by active/inactive status
 * 9. Test sorting by ban_date in ascending and descending order
 * 10. Test sorting by created_at
 * 11. Test sorting by appeal_eligible_date
 * 12. Test combined filtering with pagination and sorting
 * 13. Verify pagination information structure and correctness
 * 14. Verify ban data structure in results
 */
export async function test_api_member_bans_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for ban management operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(12),
      password: RandomGenerator.alphaNumeric(10),
      ip: "127.0.0.1",
      href: "http://localhost:3000/auth/moderator/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test pagination with default parameters
  const defaultPage =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default pagination should return valid page structure",
    defaultPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "default pagination current page should be at least 1",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination should return data array",
    Array.isArray(defaultPage.data),
  );

  // Step 3: Test pagination with specific page and limit (page 1, limit 5)
  const page1Limit5 =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.predicate(
    "page 1 limit 5 should not exceed 5 results",
    page1Limit5.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit in response should match request",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page should match request",
    page1Limit5.pagination.current,
    1,
  );

  // Step 4: Test pagination with different limit (limit 10)
  const page1Limit10 =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          limit: 10,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.predicate(
    "limit 10 should not exceed 10 results",
    page1Limit10.data.length <= 10,
  );
  TestValidator.equals(
    "limit in response should be 10",
    page1Limit10.pagination.limit,
    10,
  );

  // Step 5: Test with maximum allowed limit (100)
  const maxLimitResult =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit (100) should return valid results",
    maxLimitResult.data.length <= 100,
  );
  TestValidator.equals(
    "max limit in response should be 100",
    maxLimitResult.pagination.limit,
    100,
  );

  // Step 6: Test filtering by ban reason keywords
  const reasonFilterResult =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          reason: "harassment",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(reasonFilterResult);
  TestValidator.predicate(
    "reason filter should return valid pagination",
    reasonFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "reason filter should return data array",
    Array.isArray(reasonFilterResult.data),
  );

  // Step 7: Test filtering by ban date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const dateRangeResult =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          ban_date_from: oneDayAgo.toISOString(),
          ban_date_to: now.toISOString(),
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter should return valid results",
    dateRangeResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "date range filter should return data array",
    Array.isArray(dateRangeResult.data),
  );

  // Step 8: Test filtering by appeal eligibility (eligible)
  const appealEligibleTrue =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          appeal_eligible: true,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(appealEligibleTrue);
  TestValidator.predicate(
    "appeal_eligible true filter should return valid results",
    appealEligibleTrue.pagination !== undefined,
  );

  // Step 9: Test filtering by appeal eligibility (not eligible)
  const appealEligibleFalse =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          appeal_eligible: false,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(appealEligibleFalse);
  TestValidator.predicate(
    "appeal_eligible false filter should return valid results",
    appealEligibleFalse.pagination !== undefined,
  );

  // Step 10: Test filtering by active status (active bans)
  const activeOnly =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          is_active: true,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(activeOnly);
  TestValidator.predicate(
    "is_active true filter should return valid results",
    activeOnly.pagination !== undefined,
  );

  // Step 11: Test filtering by active status (inactive bans)
  const inactiveOnly =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          is_active: false,
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(inactiveOnly);
  TestValidator.predicate(
    "is_active false filter should return valid results",
    inactiveOnly.pagination !== undefined,
  );

  // Step 12: Test sorting by ban_date ascending
  const sortBanDateAsc =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          order_by: "ban_date",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortBanDateAsc);
  TestValidator.predicate(
    "sort by ban_date ascending should return valid results",
    sortBanDateAsc.pagination !== undefined,
  );

  // Step 13: Test sorting by ban_date descending
  const sortBanDateDesc =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          order_by: "ban_date",
          order: "desc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortBanDateDesc);
  TestValidator.predicate(
    "sort by ban_date descending should return valid results",
    sortBanDateDesc.pagination !== undefined,
  );

  // Step 14: Test sorting by member_name
  const sortMemberName =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          order_by: "member_name",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortMemberName);
  TestValidator.predicate(
    "sort by member_name should return valid results",
    sortMemberName.pagination !== undefined,
  );

  // Step 15: Test sorting by appeal_eligible_date
  const sortAppealDate =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          order_by: "appeal_eligible_date",
          order: "asc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortAppealDate);
  TestValidator.predicate(
    "sort by appeal_eligible_date should return valid results",
    sortAppealDate.pagination !== undefined,
  );

  // Step 16: Test sorting by created_at
  const sortCreatedAt =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          order_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(sortCreatedAt);
  TestValidator.predicate(
    "sort by created_at should return valid results",
    sortCreatedAt.pagination !== undefined,
  );

  // Step 17: Test combined filtering and pagination
  const combinedQuery =
    await api.functional.communityPlatform.moderator.memberBans.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_active: true,
          order_by: "ban_date",
          order: "desc",
        } satisfies ICommunityPlatformMemberBan.IRequest,
      },
    );
  typia.assert(combinedQuery);
  TestValidator.predicate(
    "combined query should return valid pagination",
    combinedQuery.pagination !== undefined,
  );
  TestValidator.equals(
    "combined query should respect limit",
    combinedQuery.pagination.limit,
    10,
  );
  TestValidator.equals(
    "combined query should respect page",
    combinedQuery.pagination.current,
    1,
  );

  // Step 18: Verify pagination information structure
  TestValidator.predicate(
    "pagination should have valid current page",
    combinedQuery.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    combinedQuery.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    combinedQuery.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    combinedQuery.pagination.pages >= 0,
  );

  // Step 19: Verify ban data structure when results exist
  if (combinedQuery.data.length > 0) {
    const ban = combinedQuery.data[0];
    TestValidator.predicate(
      "ban should have valid id",
      ban.id !== undefined && ban.id.length > 0,
    );
    TestValidator.predicate(
      "ban should have valid ban_reason",
      ban.ban_reason !== undefined && ban.ban_reason.length > 0,
    );
    TestValidator.predicate(
      "ban should have valid banned_at timestamp",
      ban.banned_at !== undefined,
    );
    TestValidator.predicate(
      "ban should have valid created_at timestamp",
      ban.created_at !== undefined,
    );
  }

  // Step 20: Test pagination with page 2 (if multiple pages exist)
  if (defaultPage.pagination.pages > 1) {
    const page2 =
      await api.functional.communityPlatform.moderator.memberBans.index(
        connection,
        {
          body: {
            page: 2,
            limit: defaultPage.pagination.limit,
          } satisfies ICommunityPlatformMemberBan.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 should have correct page number",
      page2.pagination.current,
      2,
    );
  }
}
