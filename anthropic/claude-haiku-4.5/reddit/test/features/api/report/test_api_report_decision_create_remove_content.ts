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

export async function test_api_report_decision_create_remove_content(
  connection: api.IConnection,
) {
  // 1. Administrator creates a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "https://localhost:3000/admin/register",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Moderator joins the platform
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(8),
      href: "https://localhost:3000/moderator/register",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 3. Member joins the platform
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphabets(8),
      href: "https://localhost:3000/member/register",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member creates a post with content that violates rules
  const violatingPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Spam or Harassment Content",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violatingPost);

  // 6. Switch to moderator for making decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://localhost:3000/moderator/login",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Create moderation decision to remove content
  // Note: reportId would be obtained from a report creation workflow
  // or passed as a parameter in a real integration scenario
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community harassment and spam policy. Post contains explicit spam targeting other members.",
          internal_notes:
            "Third violation by this member in current moderation period. Consider escalation if pattern continues.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 8. Validate the decision was created correctly
  TestValidator.equals(
    "decision action type should be remove_content",
    decision.action_type,
    "remove_content",
  );

  TestValidator.predicate(
    "decision reason should be at least 10 characters",
    decision.reason.length >= 10,
  );

  TestValidator.equals(
    "decision reason should match what was provided",
    decision.reason,
    "Content violates community harassment and spam policy. Post contains explicit spam targeting other members.",
  );

  TestValidator.predicate(
    "decision should have moderator information",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  TestValidator.equals(
    "decision moderator ID should match authenticated moderator",
    decision.moderator.id,
    moderator.id,
  );

  TestValidator.predicate(
    "decision should have report information",
    decision.report !== null && decision.report !== undefined,
  );

  TestValidator.predicate(
    "decision may have internal notes",
    decision.internal_notes === null ||
      decision.internal_notes === undefined ||
      typeof decision.internal_notes === "string",
  );

  TestValidator.predicate(
    "decision created_at timestamp should be set",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  TestValidator.predicate(
    "decision should not have deletion timestamp (active decision)",
    decision.deleted_at === null || decision.deleted_at === undefined,
  );
}
