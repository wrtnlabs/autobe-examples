import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Validates that appeal submission fails when the report decision reference
 * does not exist.
 *
 * This test ensures that the moderation appeal system enforces foreign key
 * constraints and prevents members from submitting appeals that reference
 * nonexistent report decisions. The test authenticates as a member, generates a
 * random UUID that corresponds to no actual report decision, and attempts to
 * submit an appeal with this invalid reference. The operation should fail with
 * a 400 Bad Request or 404 Not Found error.
 *
 * This validates:
 *
 * 1. Foreign key constraint enforcement on community_platform_report_decision_id
 * 2. Prevention of orphaned appeal records
 * 3. Proper error handling for invalid decision references
 * 4. API validation of required relationships before appeal creation
 */
export async function test_api_moderation_appeal_submission_invalid_report_decision_reference(
  connection: api.IConnection,
) {
  // 1. Create a member account for appeal submission
  const memberAuthResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuthResponse);

  // 2. Attempt to submit an appeal with a nonexistent report decision UUID
  const invalidDecisionId = typia.random<string & tags.Format<"uuid">>();
  const appealReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  // 3. Test that the appeal submission fails with error
  await TestValidator.error(
    "appeal submission should fail with invalid report decision reference",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.create(
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
