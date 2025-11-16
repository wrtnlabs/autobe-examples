import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test the transparent appeal review process with defined timeframes, recorded
 * decisions, and explanatory feedback.
 *
 * This test validates the Reddit Community's appeal system which provides
 * members with a formal mechanism to challenge moderation actions they believe
 * were applied unfairly, excessively, or in error. The process upholds platform
 * commitment to due process while balancing user rights with community safety
 * standards.
 *
 * Test Process:
 *
 * 1. Create a new member account for authentication
 * 2. Submit an appeal with detailed rationale and supporting evidence
 * 3. Validate the appeal response structure and transparency features
 * 4. Verify that the appeal system maintains educational value and due process
 *
 * The appeal system ensures:
 *
 * - Substantial reasoning requirements (minimum 50 characters)
 * - Clear remedy requests (full_reversal, modification, or clarification)
 * - Transparent tracking with status updates
 * - Educational feedback for policy improvement
 */
export async function test_api_member_appeal_transparent_review_process(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name()
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .substring(0, 21),
        email: memberEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Verify member was created successfully
  TestValidator.equals("member email matches", member.email, memberEmail);

  // Step 2: Submit appeal with comprehensive rationale and evidence
  const appealRationale = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });

  const supportingEvidence = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 6,
  });

  // Generate a random moderation action ID for the appeal
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  const appeal: IRedditCommunityAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: appealRationale,
        requested_remedy: RandomGenerator.pick([
          "full_reversal",
          "modification",
          "clarification",
        ] as const),
        supporting_evidence: supportingEvidence,
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(appeal);

  // Step 3: Validate appeal response structure and transparency features
  TestValidator.equals(
    "appeal rationale matches",
    appeal.rationale,
    appealRationale,
  );
  TestValidator.predicate(
    "requested remedy is valid",
    ["full_reversal", "modification", "clarification"].includes(
      appeal.requested_remedy,
    ),
  );
  TestValidator.equals(
    "appeal supporting evidence matches",
    appeal.supporting_evidence,
    supportingEvidence,
  );
  TestValidator.equals(
    "moderation action ID matches",
    appeal.reddit_moderation_action_id,
    moderationActionId,
  );

  // Validate appellant information integrity
  TestValidator.equals(
    "appellant ID matches member",
    appeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appellant nickname matches",
    appeal.appellant.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "appellant email matches",
    appeal.appellant.email,
    member.email,
  );

  // Step 4: Verify appeal status and business workflow
  TestValidator.equals(
    "appeal status is submitted",
    appeal.status,
    "submitted",
  );
  TestValidator.equals(
    "business status is filed",
    appeal.business_status,
    "filed",
  );

  // Validate that decision fields are null initially (not decided yet)
  TestValidator.equals("decision is null initially", appeal.decision, null);
  TestValidator.equals(
    "decision reasoning is null initially",
    appeal.decision_reasoning,
    null,
  );
  TestValidator.equals(
    "responded at is null initially",
    appeal.responded_at,
    null,
  );

  // Step 5: Verify transparency and due process features
  TestValidator.predicate(
    "rationale meets minimum length",
    appeal.rationale.length >= 50,
  );
  TestValidator.predicate(
    "supporting evidence within max length",
    appeal.supporting_evidence!.length <= 5000,
  );

  // Verify that the appeal system maintains educational value through detailed feedback capabilities
  TestValidator.predicate(
    "appeal timestamp fields are present",
    typeof appeal.created_at === "string" &&
      typeof appeal.updated_at === "string" &&
      typeof appeal.appealed_at === "string",
  );

  // Validate member authorization integrity
  TestValidator.predicate(
    "member created at timestamp is valid",
    typeof appeal.appellant.created_at === "string" &&
      appeal.appellant.created_at.length > 0,
  );
}
