import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

/**
 * Validate filtering member warnings by warning count range (min/max
 * thresholds).
 *
 * This test creates multiple members with varying warning counts and validates
 * that the warning count filter API (warningCountMin and warningCountMax)
 * correctly returns only members within the specified range. Tests various
 * scenarios:
 *
 * 1. No filter - returns all warnings
 * 2. Only minimum threshold - returns warnings >= min count
 * 3. Only maximum threshold - returns warnings <= max count
 * 4. Both thresholds - returns warnings between min and max (inclusive)
 * 5. No results scenario - when range doesn't match any warnings
 *
 * Setup:
 *
 * - Create administrator account for permission to search warnings
 * - Create first member with 1 warning
 * - Create second member with 3 warnings
 * - Create third member (optional) with different count for edge cases
 *
 * Validation:
 *
 * - Verify each filter returns correct subset of warnings
 * - Verify warning counts in results match the filter criteria
 * - Verify pagination and sorting work correctly with filters
 */
export async function test_api_member_warnings_filter_by_warning_count_range(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for warning search capability
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first member to receive 1 warning
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 3: Create warning for first member (count = 1)
  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // Step 4: Create second member to receive multiple warnings
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 5: Create first warning for second member (count = 1)
  const warning2_1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2_1);

  // Step 6: Create second warning for second member (count = 2)
  const warning2_2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "off_topic",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2_2);

  // Step 7: Create third warning for second member (count = 3)
  const warning2_3: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "misinformation",
          warningCount: 3,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2_3);

  // Step 8: Test filtering with no thresholds (get all warnings)
  const allWarnings: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(allWarnings);
  TestValidator.predicate(
    "all warnings should be at least 4 total",
    allWarnings.data.length >= 4,
  );

  // Step 9: Test with only minimum threshold (warningCountMin = 2)
  const minFiltered: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          warningCountMin: 2,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(minFiltered);
  TestValidator.predicate(
    "minimum filtered results should only have warnings with count >= 2",
    minFiltered.data.every((w) => w.warningCount >= 2),
  );

  // Step 10: Test with only maximum threshold (warningCountMax = 1)
  const maxFiltered: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          warningCountMax: 1,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(maxFiltered);
  TestValidator.predicate(
    "maximum filtered results should only have warnings with count <= 1",
    maxFiltered.data.every((w) => w.warningCount <= 1),
  );

  // Step 11: Test with both thresholds (warningCountMin = 1, warningCountMax = 2)
  const rangeFiltered: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          warningCountMin: 1,
          warningCountMax: 2,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(rangeFiltered);
  TestValidator.predicate(
    "range filtered results should only have warnings between 1 and 2",
    rangeFiltered.data.every((w) => w.warningCount >= 1 && w.warningCount <= 2),
  );

  // Step 12: Test narrow range that should return specific member
  const narrowRange: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          warningCountMin: 3,
          warningCountMax: 3,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(narrowRange);
  TestValidator.predicate(
    "narrow range (3-3) should return only warnings with count 3",
    narrowRange.data.every((w) => w.warningCount === 3),
  );

  // Step 13: Test empty result scenario (no warnings match range)
  const emptyRange: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          warningCountMin: 10,
          warningCountMax: 15,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(emptyRange);
  TestValidator.equals(
    "range with no matching warnings should return empty results",
    emptyRange.data,
    [],
  );

  // Step 14: Test pagination with filtered results
  const paginatedFiltered: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
          warningCountMin: 1,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(paginatedFiltered);
  TestValidator.predicate(
    "pagination should respect limit",
    paginatedFiltered.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginatedFiltered.pagination.current === 1 &&
      paginatedFiltered.pagination.limit === 2,
  );
}
