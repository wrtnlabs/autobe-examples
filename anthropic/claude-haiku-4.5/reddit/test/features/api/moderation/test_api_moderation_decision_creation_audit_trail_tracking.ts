import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test that moderation decision creation creates comprehensive audit trail
 * entries.
 *
 * This test validates that when a moderator makes a decision on a reported
 * post, the system captures complete audit trail information including
 * moderator identity, decision action type, reasoning, affected content, and
 * immutable timestamps.
 *
 * The test flow:
 *
 * 1. Create a moderator account
 * 2. Create a member account who will report content
 * 3. Create a post by the member
 * 4. Submit a report on the post
 * 5. Create a moderation decision on the report
 * 6. Verify decision audit trail completeness and immutability
 * 7. Verify decision captures all required accountability information
 */
export async function test_api_moderation_decision_creation_audit_trail_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(),
        password: "SecurePassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email should match",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: "SecurePassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a post to be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Submit a report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "off_topic",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.equals(
    "report status should be submitted",
    report.status,
    "submitted",
  );

  // Step 5: Switch to moderator and create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
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
            "This post violates community off-topic policy and should be removed from feeds",
          internal_notes:
            "Third off-topic violation by this member in current month",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Verify decision audit trail completeness
  TestValidator.equals(
    "decision action type should be remove_content",
    decision.action_type,
    "remove_content",
  );
  TestValidator.predicate(
    "decision reason should meet minimum length requirement",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "moderator ID should be recorded in decision",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator username should be in decision audit trail",
    decision.moderator.username,
    moderator.username,
  );
  TestValidator.equals(
    "decision should reference the reported content",
    decision.report.id,
    report.id,
  );

  // Step 7: Verify audit trail timestamps for immutability
  TestValidator.predicate(
    "decision created_at timestamp should be set",
    decision.created_at !== null && decision.created_at !== undefined,
  );
  TestValidator.predicate(
    "decision updated_at should equal created_at initially",
    decision.updated_at === decision.created_at,
  );
  TestValidator.predicate(
    "decision deleted_at should be null (not overturned)",
    decision.deleted_at === null || decision.deleted_at === undefined,
  );

  // Step 8: Verify complete audit trail accountability
  TestValidator.predicate(
    "audit trail contains moderator identity and action",
    decision.moderator.id === moderator.id &&
      decision.action_type === "remove_content" &&
      decision.reason.length >= 10 &&
      decision.created_at !== null,
  );

  // Step 9: Verify suspension action type with duration
  const suspensionReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_member_id: typia.random<string & tags.Format<"uuid">>(),
        category: "harassment",
        additional_details: "Repeated harassment across multiple posts",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(suspensionReport);

  const suspensionDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: suspensionReport.id,
        body: {
          action_type: "suspend_user",
          reason:
            "Member violated community harassment policy with repeated violations across multiple interactions",
          suspension_duration_days: 7,
          internal_notes:
            "Review for potential permanent ban if violations continue",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(suspensionDecision);
  TestValidator.equals(
    "suspension duration should be captured in audit trail",
    suspensionDecision.suspension_duration_days,
    7,
  );
  TestValidator.equals(
    "suspension action type should be recorded",
    suspensionDecision.action_type,
    "suspend_user",
  );

  // Step 10: Verify immutability principle - decisions provide complete accountability
  TestValidator.predicate(
    "decisions provide complete moderator accountability",
    decision.moderator.id !== null &&
      decision.moderator.username !== null &&
      decision.action_type !== null &&
      decision.reason !== null &&
      decision.created_at !== null &&
      decision.deleted_at === null, // Decision not overturned
  );
}
