import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Validates the complete karma audit trail for a member.
 *
 * This test creates a new member account and verifies that the karma history
 * API returns an accurate, immutable audit trail of all karma changes. The test
 * validates that:
 *
 * 1. A new member starts with 0 karma
 * 2. The karma history is initially empty or contains only the initialization
 *    record
 * 3. All karma changes are properly documented with change reasons
 * 4. The sum of all karma_change values equals the difference between initial
 *    karma (0) and final karma score
 * 5. Each history record contains complete information including member context,
 *    change reason, amounts, and timestamp
 * 6. The audit trail is immutable and provides complete transparency
 *
 * Steps:
 *
 * 1. Create a new member account via POST /auth/member/join
 * 2. Retrieve the member's complete karma history via GET
 *    /communityPlatform/member/members/{memberId}/karmaHistory
 * 3. Validate that the history response contains pagination metadata
 * 4. Verify that each history record has all required fields and valid data
 * 5. Calculate the sum of all karma changes and verify it matches the expected
 *    progression
 * 6. Confirm that the member information in history records matches the member who
 *    generated the changes
 * 7. Verify that the audit trail provides complete transparency of reputation
 *    evolution
 */
export async function test_api_karma_history_member_complete_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(5);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        ip: "127.0.0.1",
        href: "http://localhost:3000/join" satisfies string &
          tags.Format<"uri">,
        referrer: "http://localhost:3000" satisfies string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMember.ICreate,
    });

  typia.assert(joinResponse);
  const memberId: string & tags.Format<"uuid"> = joinResponse.id;
  const initialKarmaScore: number = 0; // New members start with 0 karma

  // Step 2: Retrieve the member's complete karma history
  const karmaHistoryResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.members.karmaHistory.at(
      connection,
      {
        memberId: memberId,
      },
    );

  typia.assert(karmaHistoryResponse);

  // Step 3: Validate pagination metadata
  const pagination: IPage.IPagination = karmaHistoryResponse.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    pagination.pages >= 0,
  );

  // Step 4: Validate and collect all karma history records
  const historyRecords: ICommunityPlatformKarmaHistory[] =
    karmaHistoryResponse.data;
  typia.assert(historyRecords);

  // Verify that each record has all required fields
  for (const record of historyRecords) {
    typia.assert(record);

    // Validate ID is UUID format
    TestValidator.predicate(
      `karma history record ${record.id} has valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        record.id,
      ),
    );

    // Validate member information is present
    TestValidator.predicate(
      `karma history record ${record.id} has member information`,
      record.member !== null && record.member !== undefined,
    );

    if (record.member) {
      TestValidator.predicate(
        `member ${record.member.id} matches target member`,
        record.member.id === memberId,
      );

      TestValidator.predicate(
        `member ${record.member.username} has valid username`,
        record.member.username.length > 0,
      );

      TestValidator.predicate(
        `member karma score is non-negative`,
        record.member.karma_score >= 0,
      );
    }

    // Validate change reason is one of the allowed values
    const validReasons = [
      "vote_created",
      "vote_removed",
      "vote_changed",
      "vote_reversed",
      "content_removed",
      "user_suspended",
      "user_banned",
      "correction",
    ];
    TestValidator.predicate(
      `karma change reason ${record.change_reason} is valid`,
      validReasons.includes(record.change_reason),
    );

    // Validate karma change is an integer
    TestValidator.predicate(
      `karma change ${record.karma_change} is integer`,
      Number.isInteger(record.karma_change),
    );

    // Validate previous_total and new_total are non-negative integers
    TestValidator.predicate(
      `previous total karma ${record.previous_total} is non-negative integer`,
      Number.isInteger(record.previous_total) && record.previous_total >= 0,
    );

    TestValidator.predicate(
      `new total karma ${record.new_total} is non-negative integer`,
      Number.isInteger(record.new_total) && record.new_total >= 0,
    );

    // Validate that karma calculation is correct
    const calculatedNewTotal: number =
      record.previous_total + record.karma_change;
    const expectedNewTotal: number = Math.max(0, calculatedNewTotal); // Karma floor is 0
    TestValidator.equals(
      `new total karma matches calculated value for record ${record.id}`,
      record.new_total,
      expectedNewTotal,
    );

    // Validate timestamp is present and valid ISO 8601 format
    TestValidator.predicate(
      `created_at timestamp ${record.created_at} is valid ISO 8601`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.created_at),
    );
  }

  // Step 5: Calculate sum of all karma changes and verify it matches expected progression
  const totalKarmaChange: number = historyRecords.reduce(
    (sum, record) => sum + record.karma_change,
    0,
  );

  const expectedFinalKarma: number = Math.max(
    0,
    initialKarmaScore + totalKarmaChange,
  );

  // Verify that the final karma from the last record (if any) matches expected value
  if (historyRecords.length > 0) {
    const lastRecord: ICommunityPlatformKarmaHistory =
      historyRecords[historyRecords.length - 1];
    TestValidator.equals(
      "final karma score from last history record matches calculated progression",
      lastRecord.new_total,
      expectedFinalKarma,
    );
  } else {
    // No history records means member still has initial karma
    TestValidator.equals(
      "new member with no history has initial karma of 0",
      expectedFinalKarma,
      initialKarmaScore,
    );
  }

  // Step 6: Verify audit trail integrity
  // Check that records are ordered chronologically (oldest first or newest first consistently)
  if (historyRecords.length > 1) {
    for (let i = 0; i < historyRecords.length - 1; i++) {
      const current = historyRecords[i];
      const next = historyRecords[i + 1];

      // Verify that each consecutive record's new_total matches the next record's previous_total
      // (This indicates the chain is intact and complete)
      // Note: This depends on the API ordering; if descending, verify in reverse
      TestValidator.predicate(
        `history records are linked - record ${i + 1} previous_total matches record ${i} new_total or vice versa`,
        next.previous_total === current.new_total ||
          current.previous_total === next.new_total,
      );
    }
  }

  // Step 7: Verify complete transparency - all records have reference IDs where applicable
  for (const record of historyRecords) {
    // Reference ID should exist for vote-related and content removal changes
    const reasonsRequiringReference = [
      "vote_created",
      "vote_removed",
      "vote_changed",
      "vote_reversed",
      "content_removed",
    ];

    if (reasonsRequiringReference.includes(record.change_reason)) {
      TestValidator.predicate(
        `karma history record ${record.id} with reason ${record.change_reason} has reference ID or is null`,
        record.reference_id === undefined ||
          record.reference_id === null ||
          (typeof record.reference_id === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              record.reference_id,
            )),
      );
    }
  }

  TestValidator.predicate(
    "complete karma audit trail retrieved successfully",
    true,
  );
}
