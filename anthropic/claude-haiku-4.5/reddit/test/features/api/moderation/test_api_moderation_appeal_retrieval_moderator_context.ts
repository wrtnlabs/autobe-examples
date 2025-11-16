import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test that moderators can retrieve appeals related to their decisions.
 *
 * This test validates moderator-scoped access to moderation appeals. A
 * moderator creates a moderation decision on a reported post, a member appeals
 * that decision, and the original moderator retrieves the appeal to review the
 * appeal outcome and reasoning. This ensures moderators have visibility into
 * appeals against their decisions for learning and improving moderation
 * practices.
 *
 * Test workflow:
 *
 * 1. Create administrator account for system setup
 * 2. Create member account to post and appeal
 * 3. Create moderator account to make moderation decisions
 * 4. Member creates a post in a community
 * 5. Member reports their own post (for testing purposes)
 * 6. Moderator creates a decision on the report (e.g., removing content)
 * 7. Member appeals the moderation decision
 * 8. Administrator retrieves the appeal to verify moderator can access it
 * 9. Validate appeal contains moderator context and decision information
 */
export async function test_api_moderation_appeal_retrieval_moderator_context(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create member account for posting and appealing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPassword123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/auth/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Switch to member and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Member reports their own post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: "Testing moderation appeal workflow",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 6: Switch to moderator and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community spam policy and was reported by community members",
          internal_notes: "First report on this user, removal appropriate",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 7: Switch to member and appeal the decision
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "My post was educational content about community guidelines and was not spam. The moderator misunderstood the intent.",
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 8: Switch to administrator and retrieve the appeal
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const retrievedAppeal =
    await api.functional.communityPlatform.administrator.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 9: Validate appeal contains moderator context and decision information
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal appellant ID matches member",
    retrievedAppeal.appellant.id,
    member.id,
  );
  TestValidator.equals(
    "appeal decision ID matches moderator decision",
    retrievedAppeal.decision.id,
    decision.id,
  );
  TestValidator.predicate(
    "appeal reason is preserved",
    retrievedAppeal.appeal_reason === appeal.appeal_reason,
  );
  TestValidator.predicate(
    "appeal status is submitted or in_review",
    retrievedAppeal.appeal_status === "submitted" ||
      retrievedAppeal.appeal_status === "in_review",
  );
  TestValidator.predicate(
    "decision action type is remove_content",
    retrievedAppeal.decision.action_type === "remove_content",
  );
  TestValidator.predicate(
    "moderator information is accessible",
    retrievedAppeal.decision.moderator_username !== undefined &&
      retrievedAppeal.decision.moderator_username.length > 0,
  );
}
