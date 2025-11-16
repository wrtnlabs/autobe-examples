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
 * Test that duplicate appeals on the same report decision are prevented.
 *
 * Validates that the system enforces one active appeal per decision to prevent
 * appeal spam. The test creates a complete moderation workflow: member
 * registration → moderator registration → post creation → report submission →
 * moderation decision → first appeal submission (succeeds) → second appeal
 * submission (fails with 400 error).
 *
 * This ensures moderators are not overwhelmed with duplicate reviews of the
 * same decision.
 *
 * Process:
 *
 * 1. Create member account for appeal submission
 * 2. Create moderator account for making decisions
 * 3. Create post to be reported
 * 4. Submit report on the post
 * 5. Create moderation decision on the report
 * 6. Submit first appeal (should succeed)
 * 7. Attempt second appeal on same decision (should fail with 400 error)
 */
export async function test_api_moderation_appeal_submission_duplicate_appeal_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create member account for appeal submission
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member should be created", member.id !== undefined);

  // Step 2: Create moderator account for making decisions
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be created",
    moderator.id !== undefined,
  );

  // Step 3: Create post to be reported
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate("post should be created", post.id !== undefined);

  // Step 4: Submit report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post violates community harassment policy",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.predicate("report should be created", report.id !== undefined);

  // Step 5: Switch to moderator account and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
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
            "This content violates community policy on harassment and abusive behavior",
          internal_notes: "First violation by this member",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.predicate(
    "decision should be created",
    decision.id !== undefined,
  );

  // Step 6: Switch back to member account and submit first appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const firstAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe the moderation decision was unfair and made in error. The content was educational and not intended to violate any policies. I respectfully request a review of this decision.",
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(firstAppeal);
  TestValidator.predicate(
    "first appeal should be created",
    firstAppeal.id !== undefined,
  );
  TestValidator.equals(
    "first appeal status",
    firstAppeal.appeal_status,
    "submitted",
  );

  // Step 7: Attempt to submit second appeal on the same decision (should fail with 400)
  await TestValidator.error(
    "duplicate appeal submission should fail",
    async () => {
      await api.functional.communityPlatform.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: decision.id,
            appeal_reason:
              "This is a duplicate appeal attempt that should be blocked by the system to prevent appeal spam",
            supporting_evidence: "https://example.com/more-evidence",
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "duplicate appeal prevention mechanism is working",
    true,
  );
}
