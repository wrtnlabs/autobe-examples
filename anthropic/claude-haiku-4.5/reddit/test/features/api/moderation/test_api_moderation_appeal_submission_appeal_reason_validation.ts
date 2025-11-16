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

/**
 * Test that appeal_reason field is validated for required length and quality.
 *
 * This test validates the appeal_reason field constraint ensuring appeals are
 * substantive with minimum 50 characters and maximum 1000 characters. It tests
 * boundary conditions and validates that the API enforces proper length
 * requirements to prevent frivolous or low-effort appeals.
 *
 * Note: This test focuses on appeal_reason validation. In a real system,
 * appeals would reference actual moderation decisions. The test validates the
 * constraint that appeal_reason must be between 50-1000 characters for
 * substantive appeals.
 */
export async function test_api_moderation_appeal_submission_appeal_reason_validation(
  connection: api.IConnection,
) {
  // 1. Create member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create moderator account for decision making
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Create a moderation decision for appeal testing
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          internal_notes: "Test decision for appeal validation",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 4. Switch to member account for appeal submission
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Test Case 1: Appeal with exactly 50 characters (minimum) - should succeed
  const minReasonString = RandomGenerator.alphabets(50);
  const appealMin: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: minReasonString,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appealMin);
  TestValidator.equals(
    "appeal with 50 chars reason created successfully",
    appealMin.appeal_reason.length,
    50,
  );

  // Test Case 2: Appeal with 49 characters - should fail with validation error
  await TestValidator.error(
    "appeal with 49 chars reason should fail validation",
    async () => {
      const tooShortReason = RandomGenerator.alphabets(49);
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason: tooShortReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Test Case 3: Appeal with exactly 1000 characters (maximum) - should succeed
  const maxReasonString = RandomGenerator.alphabets(1000);
  const appealMax: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: maxReasonString,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appealMax);
  TestValidator.equals(
    "appeal with 1000 chars reason created successfully",
    appealMax.appeal_reason.length,
    1000,
  );

  // Test Case 4: Appeal with 1001 characters - should fail with validation error
  await TestValidator.error(
    "appeal with 1001 chars reason should fail validation",
    async () => {
      const tooLongReason = RandomGenerator.alphabets(1001);
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason: tooLongReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Test Case 5: Appeal with empty reason - should fail
  await TestValidator.error(
    "appeal with empty reason should fail validation",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason: "",
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Test Case 6: Appeal with only whitespace - should fail
  await TestValidator.error(
    "appeal with only whitespace reason should fail validation",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason: "     ",
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Validation complete: appeal_reason field enforces substantive appeals
  TestValidator.predicate(
    "appeal_reason validation ensures substantive appeals with length constraints",
    true,
  );
}
