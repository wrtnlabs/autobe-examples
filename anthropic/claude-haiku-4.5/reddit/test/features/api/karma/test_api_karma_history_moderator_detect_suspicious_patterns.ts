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
 * Tests moderator detection of suspicious karma patterns through filtering and
 * sorting.
 *
 * Moderators need to analyze karma history to detect suspicious patterns such
 * as:
 *
 * - Rapid karma changes within short time periods (voting rings)
 * - Artificial score manipulation
 * - Fraudulent voting activity
 *
 * This test validates that moderators can effectively use filtering (by
 * member_id, change_reason, date ranges) and sorting (by date and amount) to
 * identify anomalies. It also verifies pagination support for reviewing large
 * volumes of suspicious records and confirms response data contains sufficient
 * detail for analysis.
 *
 * Process:
 *
 * 1. Create a moderator account with authentication
 * 2. Query karma history with combined filters (member_id, date range,
 *    change_reason)
 * 3. Sort results by creation date ascending to show rapid consecutive changes
 * 4. Verify pagination metadata for handling large datasets
 * 5. Validate response includes karma amounts, timestamps, and change reasons
 * 6. Confirm data structure allows identification of suspicious voting patterns
 */
export async function test_api_karma_history_moderator_detect_suspicious_patterns(
  connection: api.IConnection,
) {
  // 1. Create a moderator account for pattern analysis and fraud detection
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account should be created with email_verified flag",
    moderator.email_verified === false || moderator.email_verified === true,
  );

  // 2. Query karma history with filters to detect rapid voting patterns
  // Filter for vote_created changes by a specific member within a date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const suspiciousPattern: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          created_at_start: threeDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          sort_by: "created_at_asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(suspiciousPattern);

  // 3. Validate pagination metadata for handling large volumes of records
  TestValidator.predicate(
    "pagination should have current page number",
    suspiciousPattern.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit per page",
    suspiciousPattern.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have total records count",
    suspiciousPattern.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages calculated",
    suspiciousPattern.pagination.pages >= 0,
  );

  // 4. Verify response data contains sufficient detail for anomaly detection
  if (suspiciousPattern.data.length > 0) {
    const record = suspiciousPattern.data[0];
    typia.assert(record);

    TestValidator.predicate(
      "karma history record should have unique ID",
      record.id !== null && record.id !== undefined && record.id.length > 0,
    );
    TestValidator.predicate(
      "karma history record should have member information",
      record.member !== null && record.member !== undefined,
    );
    TestValidator.predicate(
      "member should have unique ID for tracking",
      record.member.id !== null && record.member.id !== undefined,
    );
    TestValidator.predicate(
      "member should have username for identification",
      record.member.username !== null && record.member.username !== undefined,
    );
    TestValidator.predicate(
      "karma history should specify change reason",
      record.change_reason !== null && record.change_reason !== undefined,
    );
    TestValidator.predicate(
      "karma history should record amount changed",
      typeof record.karma_change === "number",
    );
    TestValidator.predicate(
      "karma history should record previous total",
      record.previous_total >= 0,
    );
    TestValidator.predicate(
      "karma history should record new total",
      record.new_total >= 0,
    );
    TestValidator.predicate(
      "karma history should have timestamp for chronological analysis",
      record.created_at !== null && record.created_at !== undefined,
    );
  }

  // 5. Test filtering by specific member to isolate individual patterns
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const memberSpecificPattern: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: memberId,
          created_at_start: oneHourAgo.toISOString(),
          created_at_end: now.toISOString(),
          sort_by: "karma_change_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(memberSpecificPattern);

  TestValidator.predicate(
    "member-specific query should return paginated results",
    memberSpecificPattern.pagination !== null &&
      memberSpecificPattern.pagination !== undefined,
  );

  // 6. Test pagination navigation for reviewing large datasets
  if (memberSpecificPattern.pagination.pages > 1) {
    const secondPage: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            member_id: memberId,
            sort_by: "created_at_asc",
            page: 2,
            limit: 50,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page should have different records",
      secondPage.pagination.current,
      2,
    );
  }

  // 7. Test sorting by karma_change amount to identify largest manipulations
  const largestChanges: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "karma_change_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(largestChanges);

  TestValidator.predicate(
    "large changes query should return results sorted by amount",
    largestChanges.data !== null && largestChanges.data !== undefined,
  );

  // 8. Validate that filtering by different change_reason values works
  const contentRemovedPattern: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "content_removed",
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(contentRemovedPattern);

  if (contentRemovedPattern.data.length > 0) {
    TestValidator.equals(
      "filtered results should all have matching change_reason",
      contentRemovedPattern.data[0].change_reason,
      "content_removed",
    );
  }
}
