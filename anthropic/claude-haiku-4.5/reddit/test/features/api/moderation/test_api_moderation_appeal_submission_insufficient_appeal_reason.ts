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

export async function test_api_moderation_appeal_submission_insufficient_appeal_reason(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for appeal submission
  const memberEmail: string = `member_${Date.now()}@example.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "TestPassword123!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a moderator account for making decisions
  const moderatorEmail: string = `moderator_${Date.now()}@example.com`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: "ModPassword123!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Switch back to member and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 5: Switch to moderator and create a decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPassword123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community harassment policy with sufficient detail",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Switch back to member for appeal submission
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Test boundary condition - appeal with 49 characters should fail
  const insufficientReason = "a".repeat(49);

  await TestValidator.error(
    "appeal submission with 49-character reason should fail",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason: insufficientReason,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  // Step 8: Test boundary condition - appeal with 50 characters should succeed
  const sufficientReason = "b".repeat(50);

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason: sufficientReason,
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  TestValidator.predicate(
    "appeal should have initial submitted status",
    appeal.appeal_status === "submitted",
  );
}
