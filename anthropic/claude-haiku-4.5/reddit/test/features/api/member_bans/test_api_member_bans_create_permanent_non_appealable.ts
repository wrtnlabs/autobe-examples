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

export async function test_api_member_bans_create_permanent_non_appealable(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        href: "https://platform.example.com/auth/admin/join",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community organization
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account for making ban decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(10),
      href: "https://platform.example.com/auth/moderator/join",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Switch to moderator context and create a community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://platform.example.com/auth/moderator/login",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a member account involved in severe violations
  const violatingMemberEmail = typia.random<string & tags.Format<"email">>();
  const violatingMemberPassword = RandomGenerator.alphabets(12);
  const violatingMember = await api.functional.auth.member.join(connection, {
    body: {
      email: violatingMemberEmail,
      username: RandomGenerator.alphabets(8),
      password: violatingMemberPassword,
      href: "https://platform.example.com/auth/member/join",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(violatingMember);

  // Step 6: Switch to violating member context and create a violating post
  await api.functional.auth.member.login(connection, {
    body: {
      email: violatingMemberEmail,
      password: violatingMemberPassword,
      href: "https://platform.example.com/auth/member/login",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const violatingPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Severe violation content",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violatingPost);

  // Step 7: Switch back to moderator context for decision making
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://platform.example.com/auth/moderator/login",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create a moderation decision with permanent ban action
  // Note: Using a generated report ID since report creation endpoint is not in available APIs
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const reportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "Severe violation including hate speech and threats to community members. This ban is permanent with no appeal opportunity due to the severity and nature of the violations.",
          internal_notes:
            "User engaged in repeated serious violations. Multiple offenses documented. Permanent ban is warranted for community safety.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(reportDecision);

  // Step 9: Create the member ban record with null appeal_eligible_at (permanent, non-appealable)
  const memberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: violatingMember.id,
          community_platform_report_decision_id: reportDecision.id,
          ban_reason:
            "Permanent ban issued for severe platform violations including hate speech, threats, and illegal content. This ban is non-appealable due to the critical nature of the violations and community safety requirements. The member is permanently removed from the platform with no opportunity to appeal.",
          appeal_eligible_at: null,
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(memberBan);

  // Step 10: Verify the ban is recorded with null appeal_eligible_at
  TestValidator.equals(
    "ban appeal_eligible_at should be null for permanent non-appealable ban",
    memberBan.appeal_eligible_at,
    null,
  );

  // Step 11: Verify the ban reason documents permanent nature
  TestValidator.predicate(
    "ban reason should document permanent non-appealable nature",
    memberBan.ban_reason.includes("permanent") ||
      memberBan.ban_reason.includes("non-appealable") ||
      memberBan.ban_reason.includes("no opportunity"),
  );

  // Step 12: Verify moderation decision action type is ban_user
  TestValidator.equals(
    "moderation decision action should be ban_user",
    reportDecision.action_type,
    "ban_user",
  );

  // Step 13: Verify the decision reason documents permanent nature
  TestValidator.predicate(
    "decision reason should document permanent nature",
    reportDecision.reason.includes("permanent") ||
      reportDecision.reason.includes("Permanent") ||
      reportDecision.reason.includes("ban"),
  );
}
