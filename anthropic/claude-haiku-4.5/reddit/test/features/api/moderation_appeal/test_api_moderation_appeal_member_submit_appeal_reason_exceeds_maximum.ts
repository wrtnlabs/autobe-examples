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

export async function test_api_moderation_appeal_member_submit_appeal_reason_exceeds_maximum(
  connection: api.IConnection,
) {
  // Step 1: Register member account (appellant)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com/register",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPass123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com/register",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create a report (using a random UUID for demonstration)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create a moderation decision on the report
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: "This content violates community guidelines",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Generate an appeal reason that exceeds 1000 characters
  const oversizedReason =
    RandomGenerator.content({
      paragraphs: 10,
      sentenceMin: 30,
      sentenceMax: 50,
      wordMin: 5,
      wordMax: 10,
    }) + RandomGenerator.content({ paragraphs: 5 });

  // Ensure we have a reason that exceeds 1000 characters
  const finalOversizedReason =
    oversizedReason.length > 1000
      ? oversizedReason
      : oversizedReason +
        " " +
        RandomGenerator.content({ paragraphs: 10, sentenceMin: 20 });

  // Step 6: Validate that the API rejects the request with oversized reason
  await TestValidator.error(
    "should reject appeal with reason exceeding 1000 characters",
    async () => {
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason: finalOversizedReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );
}
