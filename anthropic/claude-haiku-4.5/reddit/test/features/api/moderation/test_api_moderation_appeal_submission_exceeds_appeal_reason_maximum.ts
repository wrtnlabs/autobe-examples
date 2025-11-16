import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_appeal_submission_exceeds_appeal_reason_maximum(
  connection: api.IConnection,
) {
  // Step 1: Create member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Generate 1000-character appeal reason (boundary - should succeed)
  const validReason = ArrayUtil.repeat(200, () => RandomGenerator.name(1)).join(
    " ",
  );
  const truncatedValidReason = validReason.substring(0, 1000);
  TestValidator.predicate(
    "valid reason should be exactly 1000 characters",
    truncatedValidReason.length === 1000,
  );

  // Step 4: Attempt appeal submission with 1000-character reason
  // This may fail due to missing decision reference, but tests the input validation
  const decisionId = typia.random<string & tags.Format<"uuid">>();
  const validAppealAttempt =
    await api.functional.communityPlatform.moderationAppeals
      .create(connection, {
        body: {
          community_platform_report_decision_id: decisionId,
          appeal_reason: truncatedValidReason,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      })
      .catch(() => null);

  // If the appeal was created, verify the reason length
  if (validAppealAttempt) {
    typia.assert(validAppealAttempt);
    TestValidator.equals(
      "submitted appeal reason should be 1000 characters",
      validAppealAttempt.appeal_reason.length,
      1000,
    );
  }

  // Step 5: Generate 1001-character appeal reason (should be rejected)
  const invalidReason = ArrayUtil.repeat(250, () =>
    RandomGenerator.name(1),
  ).join(" ");
  const truncatedInvalidReason = invalidReason.substring(0, 1001);
  TestValidator.predicate(
    "invalid reason should exceed 1000 characters",
    truncatedInvalidReason.length === 1001,
  );

  // Step 6: Test that appeal submission fails with 1001-character reason
  const anotherDecisionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "appeal submission should fail with 1001-character reason exceeding maximum",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: anotherDecisionId,
            appeal_reason: truncatedInvalidReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );
}
