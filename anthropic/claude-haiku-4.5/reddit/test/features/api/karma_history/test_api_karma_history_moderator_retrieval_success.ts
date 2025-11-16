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
 * Test successful retrieval of a member's complete karma history by an
 * authenticated moderator.
 *
 * This test validates that a moderator with proper authentication can retrieve
 * the full audit trail of karma adjustments for a specific member. The karma
 * history provides complete transparency into how a member's reputation score
 * has changed over time, including all adjustments from votes, content removal,
 * account discipline, and administrative corrections.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account (authenticated user with moderation
 *    privileges)
 * 2. Register a new member account whose karma history will be retrieved
 * 3. Call the karma history retrieval endpoint with the member ID
 * 4. Validate that the response includes paginated karma history records
 * 5. Verify that karma history records contain complete audit trail details
 * 6. Confirm that records are ordered by recency (newest first)
 * 7. Validate member context information is included for each record
 * 8. Verify response structure and pagination metadata
 */
export async function test_api_karma_history_moderator_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Register a moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.token.access.length > 0,
  );

  // 2. Register a member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Call the karma history retrieval endpoint with moderator authentication
  const karmaHistoryPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(karmaHistoryPage);

  // 4. Validate the paginated response structure
  TestValidator.predicate(
    "karma history response should have pagination metadata",
    karmaHistoryPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination should have current page",
    karmaHistoryPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    karmaHistoryPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have total records count",
    karmaHistoryPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages count",
    karmaHistoryPage.pagination.pages >= 0,
  );

  // 5. Validate data array exists
  TestValidator.predicate(
    "karma history data should be an array",
    Array.isArray(karmaHistoryPage.data),
  );

  // 6. If there are karma history records, validate their structure
  if (karmaHistoryPage.data.length > 0) {
    const firstRecord = karmaHistoryPage.data[0];

    // Validate karma history record structure
    typia.assert<ICommunityPlatformKarmaHistory>(firstRecord);

    // Verify record has all required fields
    TestValidator.predicate(
      "karma history record should have ID",
      firstRecord.id !== undefined && firstRecord.id.length > 0,
    );
    TestValidator.predicate(
      "karma history record should have member information",
      firstRecord.member !== undefined,
    );
    TestValidator.predicate(
      "member context should include username",
      firstRecord.member.username !== undefined &&
        firstRecord.member.username.length > 0,
    );
    TestValidator.predicate(
      "member context should include karma score",
      firstRecord.member.karma_score >= 0,
    );

    // Verify change reason is valid
    const validChangeReasons = [
      "vote_created",
      "vote_removed",
      "vote_changed",
      "vote_reversed",
      "content_removed",
      "user_suspended",
      "user_banned",
      "correction",
    ] as const;
    TestValidator.predicate(
      "change reason should be one of valid types",
      validChangeReasons.includes(firstRecord.change_reason),
    );

    // Verify karma change values
    TestValidator.predicate(
      "previous total should be non-negative",
      firstRecord.previous_total >= 0,
    );
    TestValidator.predicate(
      "new total should be non-negative",
      firstRecord.new_total >= 0,
    );
    TestValidator.predicate(
      "karma change should equal difference between totals",
      firstRecord.new_total - firstRecord.previous_total ===
        firstRecord.karma_change,
    );

    // Verify timestamp exists
    TestValidator.predicate(
      "record should have creation timestamp",
      firstRecord.created_at !== undefined && firstRecord.created_at.length > 0,
    );
  }

  // 7. Verify chronological ordering if multiple records exist
  if (karmaHistoryPage.data.length > 1) {
    for (let i = 0; i < karmaHistoryPage.data.length - 1; i++) {
      const currentRecord = karmaHistoryPage.data[i];
      const nextRecord = karmaHistoryPage.data[i + 1];

      const currentTimestamp = new Date(currentRecord.created_at).getTime();
      const nextTimestamp = new Date(nextRecord.created_at).getTime();

      TestValidator.predicate(
        `record ${i} should be newer than or equal to record ${i + 1}`,
        currentTimestamp >= nextTimestamp,
      );
    }
  }

  // 8. Validate member context consistency
  if (karmaHistoryPage.data.length > 0) {
    const memberContext = karmaHistoryPage.data[0].member;
    TestValidator.equals(
      "member context should reference the correct member",
      memberContext.id,
      member.id,
    );
  }
}
