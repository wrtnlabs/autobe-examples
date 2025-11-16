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

/**
 * Test the complete workflow for creating a member ban through the
 * administrator endpoint.
 *
 * This test validates the member ban creation process by:
 *
 * 1. Setting up administrator and member accounts
 * 2. Creating community infrastructure (category, community, post)
 * 3. Creating a moderation report decision
 * 4. Creating a member ban with proper validation
 * 5. Verifying ban details and appeal eligibility
 */
export async function test_api_member_ban_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "MemberPassword123!",
      href: "https://example.com/member/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 4. Switch to administrator to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(15),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create a post by member
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

  // 7. Switch to moderator and create moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a report decision (using a generated report ID for the test scenario)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 8. Switch to administrator and create member ban with appeal eligibility
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const appealEligibleDate = new Date();
  appealEligibleDate.setFullYear(appealEligibleDate.getFullYear() + 1);

  const banWithAppeal =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 8 }),
          appeal_eligible_at: appealEligibleDate.toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(banWithAppeal);

  // 9. Validate ban with appeal eligibility
  TestValidator.equals(
    "banned member ID matches",
    banWithAppeal.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "decision ID matches",
    banWithAppeal.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "ban reason meets minimum length requirement",
    banWithAppeal.ban_reason.length >= 50,
  );
  TestValidator.predicate(
    "appeal eligible date is set",
    banWithAppeal.appeal_eligible_at !== null &&
      banWithAppeal.appeal_eligible_at !== undefined,
  );
  TestValidator.predicate(
    "appeal eligible date is in future",
    new Date(banWithAppeal.appeal_eligible_at!) > new Date(),
  );

  // 10. Create another moderation decision for testing ban without appeal
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const decision2 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: {
          action_type: "ban_user",
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // 11. Switch back to administrator for second ban
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 12. Create a permanent ban without appeal eligibility
  const permanentBan =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision2.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 8 }),
          appeal_eligible_at: null,
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // 13. Validate permanent ban details
  TestValidator.equals(
    "permanent ban appeal_eligible_at is null",
    permanentBan.appeal_eligible_at,
    null,
  );
  TestValidator.predicate(
    "permanent ban has valid creation timestamp",
    permanentBan.banned_at !== null && permanentBan.banned_at !== undefined,
  );
  TestValidator.predicate(
    "ban timestamp follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(permanentBan.banned_at),
  );

  // 14. Verify ban creation timestamp is recent
  const banTime = new Date(permanentBan.banned_at);
  const now = new Date();
  const timeDifference = now.getTime() - banTime.getTime();
  TestValidator.predicate(
    "ban was created within reasonable time",
    timeDifference >= 0 && timeDifference < 60000,
  );
}
