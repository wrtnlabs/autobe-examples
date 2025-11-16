import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test the complete appeal submission workflow where a member creates a formal
 * appeal against a moderation action.
 *
 * This test validates the member's ability to challenge moderation decisions
 * through the Reddit Community platform's formal appeals system. The test
 * implements a complete user workflow from member registration through appeal
 * submission, ensuring all business requirements are met including validation
 * of minimum content requirements and proper formatting.
 *
 * Test workflow steps:
 *
 * 1. Register new member account for authentication
 * 2. Create formal appeal against a moderation action with detailed rationale
 * 3. Submit appeal with supporting evidence and specific remedy request
 * 4. Validate appeal structure and content requirements compliance
 * 5. Confirm appeal status and submission timestamp
 *
 * The appeal must contain substantial reasoning (minimum 50 characters)
 * explaining why the moderation action should be reversed, along with
 * supporting evidence and specific remedy request (full_reversal, modification,
 * or clarification).
 */
export async function test_api_member_appeal_submission_moderation_reversal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.MinLength<8>,
      nickname: RandomGenerator.alphabets(10) satisfies string,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  TestValidator.predicate(
    "member account created with valid authentication",
    member.token !== undefined && member.token.access.length > 0,
  );

  // Step 2-5: Create and submit appeal with detailed rationale
  const appealData = {
    rationale:
      "I believe this moderation action was applied unfairly and request a thorough review of the decision. The content in question was respectful and contributed positively to the community discussion, providing valuable insights that other members found helpful. The removal appears to be based on a technicality rather than genuine policy violation, and I am requesting reconsideration based on the context and intent of my contribution.",
    requested_remedy: RandomGenerator.pick([
      "full_reversal",
      "modification",
      "clarification",
    ] as const),
    supporting_evidence:
      "My post received positive feedback from multiple community members and generated constructive discussion. Section 3.2 of the community guidelines supports my interpretation of acceptable content standards. I have attached relevant interaction logs and member responses showing the value added to the conversation.",
  } satisfies IRedditCommunityAppeal.ICreate;

  const appeal = await api.functional.redditCommunity.member.appeals.create(
    connection,
    {
      body: appealData,
    },
  );
  typia.assert(appeal);

  // Validate appeal structure compliance
  TestValidator.equals(
    "appeal contains proper rationale with minimum length",
    appeal.rationale.length,
    appealData.rationale.length,
  );

  TestValidator.equals(
    "appeal contains requested remedy",
    appeal.requested_remedy,
    appealData.requested_remedy,
  );

  TestValidator.equals(
    "appeal contains supporting evidence",
    appeal.supporting_evidence,
    appealData.supporting_evidence,
  );

  TestValidator.equals(
    "appeal has proper appellant reference",
    appeal.appellant.id,
    member.id,
  );

  TestValidator.predicate(
    "appeal status is submitted upon creation",
    appeal.status === "submitted",
  );

  TestValidator.predicate(
    "appeal business status is filed upon creation",
    appeal.business_status === "filed",
  );

  TestValidator.predicate(
    "appeal decision is null on initial submission",
    appeal.decision === null,
  );

  TestValidator.predicate(
    "appeal has valid creation timestamp",
    new Date(appeal.created_at).getTime() > 0,
  );

  TestValidator.predicate(
    "appeal has responded_at timestamp as null on initial submission",
    appeal.responded_at === null,
  );

  TestValidator.predicate(
    "appeal deleted_at is undefined on active appeal",
    appeal.deleted_at === undefined,
  );
}
