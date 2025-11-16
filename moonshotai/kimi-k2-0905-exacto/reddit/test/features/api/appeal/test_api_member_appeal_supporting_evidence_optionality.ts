import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that supporting evidence is optional but recommended for building
 * compelling appeal cases. Validates appeals can be submitted without evidence
 * while ensuring the system encourages supporting documentation submission.
 */
export async function test_api_member_appeal_supporting_evidence_optionality(
  connection: api.IConnection,
) {
  // Step 1: Create member account first
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(8),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create appeal without supporting evidence (optional field omitted)
  const appealWithoutEvidence =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        requested_remedy: "full_reversal",
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(appealWithoutEvidence);

  // Step 3: Create appeal with supporting evidence (optional field provided)
  const appealWithEvidence =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        requested_remedy: "modification",
        supporting_evidence: RandomGenerator.paragraph({
          sentences: 20,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(appealWithEvidence);

  // Step 4: Create appeal with null supporting evidence explicitly
  const appealWithNullEvidence =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        requested_remedy: "clarification",
        supporting_evidence: null,
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(appealWithNullEvidence);

  // Step 5: Validate all appeals were created successfully
  TestValidator.equals(
    "appeal without evidence created successfully",
    appealWithoutEvidence.rationale.length > 0,
    true,
  );
  TestValidator.equals(
    "appeal with evidence created successfully",
    appealWithEvidence.rationale.length > 0,
    true,
  );
  TestValidator.equals(
    "appeal with null evidence created successfully",
    appealWithNullEvidence.rationale.length > 0,
    true,
  );

  // Step 6: Verify evidence optionality is properly handled by the system
  TestValidator.equals(
    "all appeals have valid appellant",
    appealWithoutEvidence.appellant.id === member.id &&
      appealWithEvidence.appellant.id === member.id &&
      appealWithNullEvidence.appellant.id === member.id,
    true,
  );
}
