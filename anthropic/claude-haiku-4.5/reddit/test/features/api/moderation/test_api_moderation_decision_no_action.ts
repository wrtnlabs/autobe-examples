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

export async function test_api_moderation_decision_no_action(
  connection: api.IConnection,
) {
  // 1. Admin creates category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Moderator joins platform
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
      password: "SecurePassword123!",
      href: "https://example.com/auth/moderator/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 3. Member joins platform
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: "SecurePassword123!",
      href: "https://example.com/auth/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Member creates community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member creates post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create another member to report the post
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: `reporter_${RandomGenerator.alphaNumeric(6)}`,
      password: "SecurePassword123!",
      href: "https://example.com/auth/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter);

  // 7. Reporter creates report on the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "initial report status should be submitted",
    report.status,
    "submitted",
  );

  // 8. Login as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 9. Moderator creates no_action decision
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "no_action",
          reason:
            "Content does not violate community standards. Post is compliant with all policies.",
          internal_notes:
            "Review completed. Content approved for continuation.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 10. Verify decision properties
  TestValidator.equals(
    "decision action_type should be no_action",
    decision.action_type,
    "no_action",
  );
  TestValidator.predicate(
    "decision reason should meet minimum length",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "decision moderator id should match authenticated moderator",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "decision report id should match original report",
    decision.report.id,
    report.id,
  );

  // 11. Verify post remains public (no consequences)
  TestValidator.predicate(
    "post should remain public after no_action decision",
    post.visibility_status === "public",
  );

  // 12. Verify timestamps
  TestValidator.predicate(
    "decision created_at should be valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(decision.created_at),
  );
}
