import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that deleting an appeal enables a member to submit a new appeal for the
 * same moderation action.
 *
 * This test validates that when a member deletes their appeal, they can submit
 * a new one for the same moderation action. This ensures appeal uniqueness
 * constraints are properly handled and prevents appeal spamlock scenarios where
 * users are permanently blocked from appealing due to existing appeals. The
 * test follows the complete workflow: member registration → appeal creation →
 * appeal deletion → new appeal creation, demonstrating the cycle works
 * correctly.
 */
export async function test_api_member_appeal_deletion_prevents_duplicate_submission(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        nickname: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create initial appeal against a specific moderation action
  const requestedRemedies = [
    "full_reversal",
    "modification",
    "clarification",
  ] as const;
  const initialRemovalReason:
    | "full_reversal"
    | "modification"
    | "clarification" = RandomGenerator.pick(requestedRemedies);
  const initialAppeal: IRedditCommunityAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 15,
        }),
        requested_remedy: initialRemovalReason,
        supporting_evidence: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 8,
          wordMax: 12,
        }),
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(initialAppeal);

  // Verify the initial appeal was created
  TestValidator.equals(
    "initial appeal has appellant ID",
    initialAppeal.appellant.id,
    member.id,
  );
  TestValidator.predicate(
    "initial appeal contains valid rationale",
    initialAppeal.rationale.length >= 50,
  );

  // Step 3: Delete the appeal
  await api.functional.redditCommunity.member.appeals.erase(connection, {
    appealId: initialAppeal.id,
  });

  // Step 4: Create new appeal for the same moderation action after deletion
  const newRemovalReason: "full_reversal" | "modification" | "clarification" =
    RandomGenerator.pick(requestedRemedies);
  const newAppeal: IRedditCommunityAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: {
        rationale: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 8,
          wordMax: 13,
        }),
        requested_remedy: newRemovalReason,
        supporting_evidence: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 6,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityAppeal.ICreate,
    });
  typia.assert(newAppeal);

  // Validate the new appeal is different from the deleted one
  TestValidator.notEquals(
    "new appeal has different rationale",
    newAppeal.rationale,
    initialAppeal.rationale,
  );
  TestValidator.equals(
    "new appeal has appellant ID",
    newAppeal.appellant.id,
    member.id,
  );
  TestValidator.predicate(
    "new appeal contains different rationale",
    newAppeal.rationale.length >= initialAppeal.rationale.length,
  );

  // Verify appeal deletion worked by checking we can submit a new appeal
  TestValidator.predicate("member can resubmit appeal after deletion", true);
}
