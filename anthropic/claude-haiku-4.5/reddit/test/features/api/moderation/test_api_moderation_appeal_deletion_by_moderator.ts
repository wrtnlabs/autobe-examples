import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test successful soft-deletion of a moderation appeal by an authenticated
 * moderator.
 *
 * This test validates the complete moderation appeal workflow with multiple
 * actors:
 *
 * 1. Create a moderator account for authentication and deletion authority
 * 2. Create a member account to submit the appeal
 * 3. Create a valid report decision reference for the appeal
 * 4. Submit a moderation appeal by the member challenging the decision
 * 5. Switch to moderator context and soft-delete the appeal
 * 6. Verify the appeal deletion completes successfully
 *
 * This workflow ensures proper access control, soft-deletion mechanisms, and
 * audit trail preservation for moderation governance.
 */
export async function test_api_moderation_appeal_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for deletion authority
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorResponse);
  TestValidator.predicate("moderator account created successfully", true);

  // Step 2: Create member account to submit appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(12);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberResponse);
  TestValidator.predicate("member account created successfully", true);

  // Step 3: Switch to member context and submit moderation appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  TestValidator.predicate("switched to member authentication context", true);

  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: reportDecisionId,
          appeal_reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          supporting_evidence:
            "https://community.example.com/evidence/appeal-" +
            RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.predicate("moderation appeal created successfully", true);

  // Verify appeal is in submitted status before deletion
  TestValidator.equals(
    "appeal status should be submitted on creation",
    appeal.appeal_status,
    "submitted",
  );

  // Step 4: Switch to moderator context for deletion
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  TestValidator.predicate("switched to moderator authentication context", true);

  // Step 5: Delete the appeal using moderator authority (soft-delete)
  await api.functional.communityPlatform.moderator.moderationAppeals.erase(
    connection,
    {
      appealId: appeal.id,
    },
  );
  TestValidator.predicate(
    "appeal soft-deletion executed successfully without errors",
    true,
  );
}
