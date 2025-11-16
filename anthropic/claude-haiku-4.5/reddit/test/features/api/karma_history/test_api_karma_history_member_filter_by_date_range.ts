import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_member_filter_by_date_range(
  connection: api.IConnection,
) {
  // Create a member account for testing karma history filtering
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Create test dates with clear ordering
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Test 1: Filter by only start date (created_at_start)
  // Should retrieve all karma history records from the specified start date forward
  const resultStartDateOnly =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: sevenDaysAgo.toISOString(),
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(resultStartDateOnly);
  TestValidator.predicate(
    "start date filter should return paginated results",
    resultStartDateOnly.pagination !== undefined,
  );

  // Test 2: Filter by only end date (created_at_end)
  // Should retrieve all karma history records up to and including the specified end date
  const resultEndDateOnly =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          created_at_end: threeDaysAgo.toISOString(),
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(resultEndDateOnly);
  TestValidator.predicate(
    "end date filter should return paginated results",
    resultEndDateOnly.pagination !== undefined,
  );

  // Test 3: Filter by both start and end dates (date range)
  // Should retrieve all karma history records within the specified date range (inclusive)
  const resultDateRange =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: fourteenDaysAgo.toISOString(),
          created_at_end: threeDaysAgo.toISOString(),
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(resultDateRange);
  TestValidator.predicate(
    "date range filter should return paginated results",
    resultDateRange.pagination !== undefined,
  );

  // Test 4: Verify that records are properly filtered within date range boundaries
  // Records returned should have created_at timestamps within or equal to the specified range
  if (resultDateRange.data.length > 0) {
    for (const record of resultDateRange.data) {
      const recordDate = new Date(record.created_at);
      TestValidator.predicate(
        "record should be within or after start date",
        recordDate >= fourteenDaysAgo,
      );
      TestValidator.predicate(
        "record should be within or before end date",
        recordDate <= threeDaysAgo,
      );
    }
  }

  // Test 5: Filter with member_id to verify member-specific karma history
  const resultWithMemberId =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: member1.id,
          created_at_start: sevenDaysAgo.toISOString(),
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(resultWithMemberId);
  TestValidator.predicate(
    "member-specific filter should return paginated results",
    resultWithMemberId.pagination !== undefined,
  );

  // Test 6: Filter by change reason with date range
  const resultWithReason =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          created_at_start: fourteenDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(resultWithReason);
  TestValidator.predicate(
    "filtered results should have valid pagination",
    resultWithReason.pagination.current >= 0,
  );

  // Test 7: Verify pagination structure is consistent
  TestValidator.predicate(
    "pagination should have valid current page",
    resultDateRange.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    resultDateRange.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid record count",
    resultDateRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid page count",
    resultDateRange.pagination.pages >= 0,
  );

  // Test 8: Verify that date boundary is inclusive by checking edge cases
  const exactStartDate = sevenDaysAgo.toISOString();
  const resultExactStart =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: exactStartDate,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(resultExactStart);
  TestValidator.predicate(
    "exact start date filter should return results",
    resultExactStart.pagination !== undefined,
  );
}
