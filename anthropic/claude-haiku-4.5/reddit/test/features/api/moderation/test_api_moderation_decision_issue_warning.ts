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

export async function test_api_moderation_decision_issue_warning(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/admin",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category as administrator
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion category",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account (will create community and post)
  const posterEmail = typia.random<string & tags.Format<"email">>();
  const posterPassword = RandomGenerator.alphaNumeric(12);
  const poster = await api.functional.auth.member.join(connection, {
    body: {
      email: posterEmail,
      username: RandomGenerator.alphabets(8),
      password: posterPassword,
      href: "https://community.example.com/auth/member",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(poster);

  // 4. Create community as poster
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test-community-${RandomGenerator.alphaNumeric(6)}`,
          description: "Test community for moderation",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Problematic Post",
        content_text: "This content violates community guidelines",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(12);
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: RandomGenerator.alphabets(8),
      password: reporterPassword,
      href: "https://community.example.com/auth/member",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter);

  // 7. Create report for the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post contains harassment",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 8. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "https://community.example.com/auth/moderator",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 9. Login as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/moderation",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 10. Create moderation decision with issue_warning action
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "User violated community harassment policy with inappropriate comments",
          internal_notes: "First violation, monitor for repeat behavior",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 11. Validate decision properties
  TestValidator.equals(
    "decision action_type is issue_warning",
    decision.action_type,
    "issue_warning",
  );
  TestValidator.predicate(
    "decision reason is valid",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "decision moderator matches",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "decision report id matches",
    decision.report.id,
    report.id,
  );
  TestValidator.equals(
    "internal_notes matches",
    decision.internal_notes,
    "First violation, monitor for repeat behavior",
  );
}
