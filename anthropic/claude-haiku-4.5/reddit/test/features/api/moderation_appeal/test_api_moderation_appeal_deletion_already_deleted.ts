import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test attempt to soft-delete an already soft-deleted moderation appeal.
 *
 * This scenario validates error handling when trying to delete an appeal that
 * has already been deleted. The test workflow:
 *
 * 1. Create moderator authentication to perform appeal deletion operations
 * 2. Create a member account to submit a moderation appeal
 * 3. Create a moderation appeal that will be tested for double deletion
 * 4. Delete the appeal successfully on the first attempt
 * 5. Attempt to delete the same appeal again
 * 6. Verify that the second deletion attempt returns an appropriate error
 *    (404/410) indicating the appeal is no longer available for deletion
 *
 * This validates that the system properly detects and rejects operations on
 * already-deleted resources.
 */
export async function test_api_moderation_appeal_deletion_already_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create moderator authentication
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword =
    RandomGenerator.alphabets(3) + RandomGenerator.alphaNumeric(8);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
        password: moderatorPassword,
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/auth",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to submit the appeal
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword =
    RandomGenerator.alphabets(3) + RandomGenerator.alphaNumeric(8);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword,
        href: "https://example.com/auth/member/join",
        referrer: "https://example.com/auth",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a moderation appeal
  // Note: This requires a valid report decision ID. For testing purposes, we use a realistic UUID.
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: reportDecisionId,
          appeal_reason: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 5,
            wordMax: 10,
          }),
          supporting_evidence: `https://example.com/evidence/${RandomGenerator.alphaNumeric(8)}`,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal created successfully",
    appeal.appeal_status,
    "submitted",
  );

  // Step 4: Switch to moderator account and delete the appeal successfully
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // First deletion should succeed
  await api.functional.communityPlatform.moderator.moderationAppeals.erase(
    connection,
    {
      appealId: appeal.id,
    },
  );
  TestValidator.predicate("first deletion succeeded", true);

  // Step 5: Attempt to delete the same appeal again
  // This should fail with an error indicating the appeal is already deleted
  await TestValidator.error(
    "second deletion attempt should fail with error",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.erase(
        connection,
        {
          appealId: appeal.id,
        },
      );
    },
  );
}
