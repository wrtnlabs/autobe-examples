import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test submitting an appeal with a non-existent or invalid report decision
 * UUID.
 *
 * Verifies the system validates that the referenced moderation decision exists
 * before creating the appeal. This ensures appeals can only be submitted
 * against valid, existing decisions.
 *
 * Test flow:
 *
 * 1. Register a member account
 * 2. Attempt to submit appeal with invalid report decision UUID
 * 3. Verify system rejects the appeal with error
 * 4. Confirm no appeal was created
 */
export async function test_api_moderation_appeal_member_submit_appeal_invalid_report_decision_id(
  connection: api.IConnection,
) {
  // Step 1: Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "ValidPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Attempt to submit appeal with non-existent report decision UUID
  const invalidDecisionId = typia.random<string & tags.Format<"uuid">>();
  const appealReason = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });

  await TestValidator.error(
    "should reject appeal with non-existent report decision UUID",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: invalidDecisionId,
            appeal_reason: appealReason,
            supporting_evidence: null,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );
}
