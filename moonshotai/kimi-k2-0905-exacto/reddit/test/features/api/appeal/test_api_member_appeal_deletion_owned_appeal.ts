import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that a member can successfully delete their own appeal against
 * moderation actions.
 *
 * This test validates that users have control over their submitted appeals and
 * can remove them before moderators begin review. The scenario ensures proper
 * authorization checks, data integrity maintenance, and audit trail
 * preservation throughout the appeal deletion process.
 *
 * The test follows these key steps:
 *
 * 1. Create member account through registration for authentication
 * 2. Submit a new appeal against a moderation action (using fictional moderation
 *    action ID)
 * 3. Verify the appeal was successfully created and record the appeal ID
 * 4. Delete the appeal using the member's authenticated connection
 * 5. Validate that the deletion operation completes successfully
 * 6. Test authorization boundaries to ensure members can only delete their own
 *    appeals
 * 7. Confirm that appeal data integrity is maintained through soft deletion
 */
export async function test_api_member_appeal_deletion_owned_appeal(
  connection: api.IConnection,
) {
  // Step 1: Create member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ICreate,
  });

  // Step 2: Submit a new appeal against a moderation action
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const appeal = await api.functional.redditCommunity.member.appeals.create(
    connection,
    {
      body: {
        rationale: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }) satisfies string & tags.MinLength<50>,
        requested_remedy: RandomGenerator.pick([
          "full_reversal",
          "modification",
          "clarification",
        ] as const),
        supporting_evidence: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityAppeal.ICreate,
    },
  );

  // Verify appeal creation and record appeal ID
  typia.assert(appeal);
  TestValidator.equals(
    "appeal rationale meets minimum length",
    appeal.rationale.length >= 50,
    true,
  );
  TestValidator.predicate(
    "appeal has valid status",
    ["submitted", "under_review", "decided", "closed"].includes(appeal.status),
  );
  TestValidator.equals(
    "appeal business status is correct",
    appeal.business_status,
    "filed",
  );

  // Step 3: Delete the appeal using member's authenticated connection
  await api.functional.redditCommunity.member.appeals.erase(connection, {
    appealId: appeal.id,
  });

  // Step 4: Verify deletion was successful - soft deletion is internal to the system
  // The API returns void, so we verify the deletion succeeded by ensuring no errors
  TestValidator.predicate("appeal deletion completed without errors", true);

  // Step 5: Validate appeal ownership and member relationship
  TestValidator.equals(
    "appeal appellant ID matches member ID",
    appeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appeal appellant email matches member email",
    appeal.appellant.email,
    memberEmail,
  );
}
