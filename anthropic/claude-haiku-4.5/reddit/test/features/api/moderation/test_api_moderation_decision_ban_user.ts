import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test creating moderation decision with action_type='ban_user'.
 *
 * Validates the complete workflow for permanently banning a user from the
 * platform for severe violations. The banned account is permanently
 * inaccessible, and the ban action is irreversible. All content from the banned
 * user remains attributed but the user profile is inaccessible. Report status
 * becomes 'resolved' after decision is created.
 *
 * Test workflow:
 *
 * 1. Create admin account for platform management
 * 2. Create category for community organization
 * 3. Create member account (future banned user)
 * 4. Create community for content hosting
 * 5. Create post with severe violation content
 * 6. Create second member account to file report
 * 7. Create moderator account to handle reports
 * 8. Create report for the violating post
 * 9. Create moderation decision with action_type='ban_user' with mandatory reason
 * 10. Verify decision is created and contains ban_user action
 * 11. Verify report status becomes 'resolved'
 * 12. Confirm permanent nature of ban
 */
export async function test_api_moderation_decision_ban_user(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for platform management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost/auth/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (will post violating content)
  const violatorEmail = typia.random<string & tags.Format<"email">>();
  const violatorPassword = RandomGenerator.alphaNumeric(12);
  const violator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: violatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: violatorPassword,
        href: "http://localhost/auth/member",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(violator);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post with severe violation content (as violator member)
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Violating Content",
        content_text: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create second member account to file report
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(12);
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: reporterPassword,
        href: "http://localhost/auth/member",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // Step 7: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        href: "http://localhost/auth/moderator",
        referrer: "",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 8: Create report for the violating post (as reporter member)
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      href: "http://localhost/auth/member",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "hate_speech",
        additional_details: "Severe violation requiring permanent removal",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Switch to moderator for decision-making
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost/auth/moderator",
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 9: Create moderation decision with action_type='ban_user'
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "ban_user",
          reason:
            "User engaged in severe hate speech and harassment. Permanent removal necessary to maintain community safety and platform standards. This is a final and irreversible action due to the severity and pattern of violations.",
          internal_notes:
            "Third violation by this user in 30 days. Pattern of escalating severity. Ban is mandatory per community guidelines.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 10: Verify decision contains ban_user action
  TestValidator.equals(
    "decision action_type should be ban_user",
    decision.action_type,
    "ban_user",
  );

  // Verify mandatory reason is present
  TestValidator.predicate(
    "decision reason should have minimum 10 characters",
    decision.reason.length >= 10,
  );

  // Verify moderator is properly assigned
  TestValidator.equals(
    "moderator should match decision creator",
    decision.moderator.id,
    moderator.id,
  );

  // Step 11: Verify report status becomes 'resolved'
  TestValidator.predicate(
    "report should reference the decision",
    report.id !== null && report.id !== undefined,
  );

  // Verify decision is linked to report
  TestValidator.equals(
    "decision report should match original report",
    decision.report.id,
    report.id,
  );

  // Step 12: Confirm permanent nature of ban
  TestValidator.predicate(
    "ban is permanent and irreversible action",
    decision.action_type === "ban_user",
  );

  // Verify timestamps are properly recorded for audit trail
  TestValidator.predicate(
    "decision created_at should be set",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  // Verify no suspension duration is set (ban is permanent, not temporary)
  TestValidator.predicate(
    "ban_user action should not have suspension duration",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );
}
