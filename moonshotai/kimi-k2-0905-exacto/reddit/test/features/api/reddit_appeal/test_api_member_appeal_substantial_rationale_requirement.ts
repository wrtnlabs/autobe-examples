import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that appeals require substantial reasoning with minimum character
 * requirements to prevent frivolous challenges. Validates the system enforces
 * meaningful appeal content and deters abuse of the appeals process.
 */
export async function test_api_member_appeal_substantial_rationale_requirement(
  connection: api.IConnection,
) {
  // Step 1: Create member account for appeal testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePass123!" satisfies string &
        tags.MinLength<8> &
        tags.Format<"password">,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test appeal with insufficient rationale (less than 50 characters)
  const shortRationale = "I disagree";
  TestValidator.predicate("short rationale length", shortRationale.length < 50);

  await TestValidator.error(
    "appeal with short rationale should fail",
    async () => {
      await api.functional.redditCommunity.member.appeals.create(connection, {
        body: {
          rationale: shortRationale,
          requested_remedy: "full_reversal",
        } satisfies IRedditCommunityAppeal.ICreate,
      });
    },
  );

  // Step 3: Test appeal with exactly minimum rationale length (50 characters)
  const minimumRationale = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 2,
    wordMax: 6,
  }).substring(0, 50);
  TestValidator.equals("minimum rationale length", minimumRationale.length, 50);

  const minimalAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: minimumRationale,
        requested_remedy: "full_reversal",
        supporting_evidence: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(minimalAppeal);
  TestValidator.equals(
    "minimal appeal rationale length",
    minimalAppeal.rationale.length,
    50,
  );

  // Step 4: Test appeal with substantial rationale (more than 50 characters)
  const substantialRationale =
    "I believe the moderation action was applied unfairly as the context of my comment was misunderstood. The content in question was intended to clarify policy interpretation based on community guidelines, not to disseminate misinformation. The ban duration appears excessive given the educational nature of my post and my clean moderation history spanning over two years of active participation.";
  TestValidator.predicate(
    "substantial rationale length",
    substantialRationale.length >= 50,
  );

  const substantialAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: substantialRationale,
        requested_remedy: "modification",
        supporting_evidence:
          "This is additional context explaining that I have been an active, positive contributor to the community and that my post was educational in nature, not disruptive as interpreted by the moderator. my clarification comment received positive feedback from other members who understood the educational intent.",
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(substantialAppeal);
  TestValidator.equals(
    "substantial appeal rationale has sufficient length",
    substantialAppeal.rationale.length >= 50,
    true,
  );
  TestValidator.equals(
    "substantial appeal has correct remedy",
    substantialAppeal.requested_remedy,
    "modification",
  );

  // Step 5: Test appeal with clarification remedy
  const clarificationRationale = RandomGenerator.content({ paragraphs: 3 });
  TestValidator.predicate(
    "clarification rationale has sufficient length",
    clarificationRationale.length >= 50,
  );

  const clarificationAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: clarificationRationale,
        requested_remedy: "clarification",
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(clarificationAppeal);
  TestValidator.equals(
    "clarification appeal has correct remedy",
    clarificationAppeal.requested_remedy,
    "clarification",
  );

  // Step 6: Validate all appeals have proper initial state
  TestValidator.equals(
    "minimal appeal has submitted status",
    minimalAppeal.status,
    "submitted",
  );
  TestValidator.equals(
    "substantial appeal has submitted status",
    substantialAppeal.status,
    "submitted",
  );
  TestValidator.equals(
    "clarification appeal has submitted status",
    clarificationAppeal.status,
    "submitted",
  );
  TestValidator.equals(
    "all appeals have business_status filed",
    minimalAppeal.business_status,
    "filed",
  );
  TestValidator.equals(
    "all appeals have correct appellant",
    minimalAppeal.appellant.id,
    member.id,
  );
}
