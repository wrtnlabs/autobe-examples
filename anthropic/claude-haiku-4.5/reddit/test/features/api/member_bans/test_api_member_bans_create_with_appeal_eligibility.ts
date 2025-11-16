import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_bans_create_with_appeal_eligibility(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphabets(8),
        href: "https://example.com/member/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 5. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create post that violates rules
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Inappropriate Content",
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 7. Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 8. Create moderation decision
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "Member posted content that violates community harassment and misinformation policies. User has demonstrated pattern of policy violations.",
          internal_notes:
            "Third violation by user in 30 days. Recommend permanent ban with appeal eligibility.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 9. Create ban record with appeal eligibility window
  const appealEligibleAt = new Date();
  appealEligibleAt.setFullYear(appealEligibleAt.getFullYear() + 1);

  const ban: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            "Permanent ban due to repeated violations of community harassment policy and misinformation guidelines. Member demonstrated disregard for community standards after multiple warnings.",
          appeal_eligible_at: appealEligibleAt.toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // 10. Verify ban creation and structure
  TestValidator.equals(
    "ban member ID matches banned member",
    ban.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "ban decision ID matches created decision",
    ban.community_platform_report_decision_id,
    decision.id,
  );

  // 11. Verify appeal_eligible_at is in valid ISO 8601 UTC format
  TestValidator.predicate(
    "appeal_eligible_at is valid ISO 8601 date-time",
    ban.appeal_eligible_at
      ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.appeal_eligible_at)
      : false,
  );

  // 12. Verify appeal eligibility window is approximately one year from now
  if (ban.appeal_eligible_at) {
    const appealDate = new Date(ban.appeal_eligible_at);
    const now = new Date();
    const differenceInDays = Math.floor(
      (appealDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    TestValidator.predicate(
      "appeal window is within reasonable range (350-370 days from now)",
      differenceInDays >= 350 && differenceInDays <= 370,
    );
  }

  // 13. Verify ban timestamps are present and valid
  TestValidator.predicate(
    "banned_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.banned_at),
  );

  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ban.created_at),
  );

  // 14. Verify ban is active (not deleted)
  TestValidator.equals(
    "ban deleted_at should be null for active ban",
    ban.deleted_at,
    null,
  );
}
