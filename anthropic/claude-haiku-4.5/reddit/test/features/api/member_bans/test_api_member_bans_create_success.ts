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

export async function test_api_member_bans_create_success(
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
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberToBan = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: "MemberPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberToBan);

  // 4. Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: `reporter_${RandomGenerator.alphaNumeric(8)}`,
      password: "ReporterPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporter);

  // 5. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create violating post by member to be banned
  const violatingPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Violating Content",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violatingPost);

  // 7. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      password: "ModeratorPassword123!",
      href: "http://localhost:3000/moderator/register",
      referrer: "http://localhost:3000/moderator",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 8. Login as moderator to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/moderator",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 9. Create moderation decision with ban_user action using a simulated report ID
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "User posted content that violates community harassment policy and terms of service.",
          internal_notes:
            "Third violation by user in 30 days. Pattern of abusive behavior detected.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 10. Create member ban record
  const banReason = `Permanent ban issued due to repeated violations of community standards and harassment policy. User has violated our terms of service with pattern of abusive behavior and disruptive posts that harm community.`;
  const appealEligibleAt = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const memberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: memberToBan.id,
          community_platform_report_decision_id: decision.id,
          ban_reason: banReason,
          appeal_eligible_at: appealEligibleAt,
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(memberBan);

  // 11. Verify required fields are populated
  TestValidator.equals(
    "member_id matches input",
    memberBan.community_platform_member_id,
    memberToBan.id,
  );
  TestValidator.equals(
    "decision_id matches input",
    memberBan.community_platform_report_decision_id,
    decision.id,
  );

  // 12. Confirm ban_reason is at least 50 characters
  TestValidator.predicate(
    "ban_reason meets minimum length requirement of 50 characters",
    memberBan.ban_reason.length >= 50,
  );
  TestValidator.equals(
    "ban_reason content matches input",
    memberBan.ban_reason,
    banReason,
  );

  // 13. Verify ban details are properly stored
  TestValidator.predicate(
    "ban has valid UUID identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberBan.id,
    ),
  );

  // 14. Check banned_at timestamp is set to current time
  TestValidator.predicate(
    "banned_at timestamp is present",
    memberBan.banned_at !== null && memberBan.banned_at !== undefined,
  );
  const bannedAtDate = new Date(memberBan.banned_at);
  TestValidator.predicate(
    "banned_at is recent timestamp within 60 seconds",
    Math.abs(Date.now() - bannedAtDate.getTime()) < 60000,
  );

  // 15. Confirm response includes all ban details including ID and timestamps
  TestValidator.predicate(
    "created_at timestamp is present",
    memberBan.created_at !== null && memberBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    memberBan.updated_at !== null && memberBan.updated_at !== undefined,
  );
  TestValidator.equals(
    "appeal_eligible_at matches input value",
    memberBan.appeal_eligible_at,
    appealEligibleAt,
  );
}
