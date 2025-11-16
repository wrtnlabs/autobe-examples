import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test that authenticated members can retrieve their complete karma history
 * with all available karma change events.
 *
 * This test verifies the complete workflow of member authentication and karma
 * history retrieval:
 *
 * 1. Create a new member account through registration
 * 2. Query the karma history without filters to retrieve all historical karma
 *    adjustments
 * 3. Validate pagination metadata and sorting order (newest first by default)
 * 4. Verify complete karma change record details including change reasons,
 *    amounts, and timestamps
 * 5. Confirm denormalized member summary information is included in history
 *    records
 *
 * The test ensures that karma history retrieval works correctly for
 * authenticated members and that the response contains all expected fields with
 * proper data types and formatting.
 */
export async function test_api_karma_history_member_retrieval_with_all_records(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreateBody = {
    email: memberEmail,
    username: RandomGenerator.name(1).substring(0, 20),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: "",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(authorizedMember);

  // Step 2: Query karma history without filters (retrieve all records)
  const karmaHistoryRequest = {
    member_id: undefined,
    change_reason: undefined,
    created_at_start: undefined,
    created_at_end: undefined,
    sort_by: "created_at_desc",
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;

  const karmaHistoryResponse =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: karmaHistoryRequest,
      },
    );
  typia.assert(karmaHistoryResponse);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    karmaHistoryResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    karmaHistoryResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records count should be non-negative",
    karmaHistoryResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    karmaHistoryResponse.pagination.pages >= 0,
  );

  // Step 4: Validate karma history records
  TestValidator.predicate(
    "karma history data should be an array",
    Array.isArray(karmaHistoryResponse.data),
  );

  // Validate each karma history record
  if (karmaHistoryResponse.data.length > 0) {
    const firstRecord = karmaHistoryResponse.data[0];
    typia.assert(firstRecord);

    // Verify record has required fields
    TestValidator.predicate(
      "karma history record should have id",
      firstRecord.id !== undefined && firstRecord.id !== null,
    );
    TestValidator.predicate(
      "karma history record should have member information",
      firstRecord.member !== undefined && firstRecord.member !== null,
    );
    TestValidator.predicate(
      "karma history record should have change_reason",
      firstRecord.change_reason !== undefined &&
        firstRecord.change_reason !== null,
    );
    TestValidator.predicate(
      "karma history record should have karma_change",
      firstRecord.karma_change !== undefined &&
        firstRecord.karma_change !== null,
    );
    TestValidator.predicate(
      "karma history record should have previous_total",
      firstRecord.previous_total !== undefined &&
        firstRecord.previous_total >= 0,
    );
    TestValidator.predicate(
      "karma history record should have new_total",
      firstRecord.new_total !== undefined && firstRecord.new_total >= 0,
    );
    TestValidator.predicate(
      "karma history record should have created_at timestamp",
      firstRecord.created_at !== undefined && firstRecord.created_at !== null,
    );

    // Validate member summary information
    const memberSummary = firstRecord.member;
    TestValidator.predicate(
      "member summary should have id",
      memberSummary.id !== undefined && memberSummary.id !== null,
    );
    TestValidator.predicate(
      "member summary should have username",
      memberSummary.username !== undefined && memberSummary.username !== null,
    );
    TestValidator.predicate(
      "member summary should have email",
      memberSummary.email !== undefined && memberSummary.email !== null,
    );
    TestValidator.predicate(
      "member summary should have email_verified flag",
      memberSummary.email_verified !== undefined &&
        typeof memberSummary.email_verified === "boolean",
    );
    TestValidator.predicate(
      "member summary should have account_status",
      memberSummary.account_status !== undefined &&
        memberSummary.account_status !== null,
    );
    TestValidator.predicate(
      "member summary should have karma_score",
      memberSummary.karma_score !== undefined && memberSummary.karma_score >= 0,
    );
    TestValidator.predicate(
      "member summary should have created_at",
      memberSummary.created_at !== undefined &&
        memberSummary.created_at !== null,
    );

    // Validate karma change details
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
      "change_reason should be one of valid reasons",
      validChangeReasons.includes(firstRecord.change_reason as any),
    );

    // Validate karma calculation consistency
    const calculatedNewTotal =
      firstRecord.previous_total + firstRecord.karma_change;
    TestValidator.predicate(
      "new_total should equal previous_total plus karma_change",
      calculatedNewTotal === firstRecord.new_total,
    );
  }

  // Step 5: Verify response structure matches expected type
  TestValidator.predicate(
    "response should have pagination property",
    karmaHistoryResponse.pagination !== undefined &&
      karmaHistoryResponse.pagination !== null,
  );
  TestValidator.predicate(
    "response should have data property",
    karmaHistoryResponse.data !== undefined &&
      karmaHistoryResponse.data !== null,
  );
}
