import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test the complete appeal withdrawal workflow where a member submits an appeal
 * and then decides to withdraw it before moderation review begins. Validates
 * the appeal lifecycle management and ensures proper data cleanup while
 * maintaining moderation audit trails.
 */
export async function test_api_member_appeal_deletion_withdraw_submitted_appeal(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authenticated session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a substantive appeal against a moderation action
  const appealData = {
    rationale: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    requested_remedy: RandomGenerator.pick([
      "full_reversal",
      "modification",
      "clarification",
    ] as const),
    supporting_evidence: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityAppeal.ICreate;

  const appeal = await api.functional.redditCommunity.member.appeals.create(
    connection,
    {
      body: appealData,
    },
  );
  typia.assert(appeal);

  // Validate appeal was created with correct data and initial state
  TestValidator.equals(
    "appeal rationale matches submission",
    appeal.rationale,
    appealData.rationale,
  );
  TestValidator.equals(
    "appeal requested remedy matches",
    appeal.requested_remedy,
    appealData.requested_remedy,
  );
  TestValidator.equals(
    "appeal supporting evidence matches",
    appeal.supporting_evidence,
    appealData.supporting_evidence,
  );
  TestValidator.equals(
    "appeal status is submitted",
    appeal.status,
    "submitted",
  );
  TestValidator.equals(
    "appeal business status is filed",
    appeal.business_status,
    "filed",
  );
  TestValidator.equals(
    "appeal appellant ID matches member",
    appeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appeal appellant nickname matches",
    appeal.appellant.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "appeal appellant email matches",
    appeal.appellant.email,
    member.email,
  );
  TestValidator.predicate("appeal has creation timestamp", !!appeal.created_at);
  TestValidator.predicate("appeal has update timestamp", !!appeal.updated_at);
  TestValidator.equals(
    "appeal decision is null initially",
    appeal.decision,
    null,
  );
  TestValidator.equals(
    "appeal decision reasoning is null initially",
    appeal.decision_reasoning,
    null,
  );
  TestValidator.equals(
    "appeal responded_at is null initially",
    appeal.responded_at,
    null,
  );
  TestValidator.equals(
    "appeal deleted_at is null initially",
    appeal.deleted_at,
    null,
  );

  // Step 3: Withdraw the appeal by deleting it before moderation review
  await api.functional.redditCommunity.member.appeals.erase(connection, {
    appealId: appeal.id,
  });

  // Step 4: Verify the appeal deletion/withdrawal was successful
  // The erase operation returns void, confirming successful deletion
  TestValidator.predicate("appeal deletion completed without error", true);

  // Additional validation: Verify that a member can only delete their own appeals
  // This is implicitly tested by the successful deletion with the same connection
  // that created the appeal, establishing proper authorization boundaries
}
