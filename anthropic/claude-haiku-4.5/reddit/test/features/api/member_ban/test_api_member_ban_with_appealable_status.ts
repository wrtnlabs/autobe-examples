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
 * Test member ban creation with appealable status.
 *
 * This test validates the complete workflow for creating a member ban with
 * appeal eligibility. It sets up administrator and member accounts, creates
 * community infrastructure, generates violation content through a post, issues
 * a moderation decision, and finally creates a ban with an explicit
 * appeal_eligible_at timestamp set to one year in the future.
 *
 * The test verifies that:
 *
 * 1. Ban record is created with correct appeal eligibility date
 * 2. Members can identify when they become eligible to appeal
 * 3. Ban reason is detailed and explicit about violation severity (min 50 chars)
 * 4. Proper timestamps are recorded for audit trail
 * 5. Ban lifecycle correctly reflects appealable status
 */
export async function test_api_member_ban_with_appealable_status(
  connection: api.IConnection,
) {
  // Step 1: Set up administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin/join",
        referrer: "http://localhost:3000/auth",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/auth/member/join",
      referrer: "http://localhost:3000/auth",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create violating post by the member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Violating Content",
        content_text: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Set up moderator account for decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/auth/moderator/join",
      referrer: "http://localhost:3000/auth",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 7: Create a report for the violating post
  // Note: This would typically be done through the report creation endpoint
  // For this test, we'll create a moderation decision with a mock report ID
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 8: Issue moderation decision authorizing the ban
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "This member has engaged in severe harassment and hate speech violations. The content violates community standards and our harassment policy. This decision reflects the serious nature of the violation and the member's repeated offenses.",
          internal_notes:
            "Multiple violations detected. Previous warnings ignored. Escalation to ban necessary.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 9: Create member ban with appeal eligibility set to one year from now
  const appealEligibleDate = new Date();
  appealEligibleDate.setFullYear(appealEligibleDate.getFullYear() + 1);

  const ban =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            "Permanent ban due to egregious violations of community harassment policy and hate speech standards. Member engaged in systematic targeting of other users with dehumanizing language and threats. This violation is severe and warrants permanent removal from the platform.",
          appeal_eligible_at: appealEligibleDate.toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 10: Validate ban record structure and content
  TestValidator.equals(
    "ban member ID matches",
    ban.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "ban decision ID matches",
    ban.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "ban reason is sufficiently detailed",
    ban.ban_reason.length >= 50,
  );
  TestValidator.predicate(
    "appeal eligible date is set",
    ban.appeal_eligible_at !== null && ban.appeal_eligible_at !== undefined,
  );

  // Step 11: Verify that appeal eligibility date is approximately one year in future
  if (ban.appeal_eligible_at) {
    const appealDate = new Date(ban.appeal_eligible_at);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const daysDifference = Math.abs(
      (appealDate.getTime() - oneYearFromNow.getTime()) / (1000 * 60 * 60 * 24),
    );
    TestValidator.predicate(
      "appeal eligible date is approximately one year from now",
      daysDifference < 1,
    );
  }

  // Step 12: Verify ban timestamps for audit trail
  TestValidator.predicate(
    "banned_at timestamp is set",
    ban.banned_at !== null && ban.banned_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    ban.created_at !== null && ban.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    ban.updated_at !== null && ban.updated_at !== undefined,
  );

  // Step 13: Verify ban is active (not deleted)
  TestValidator.predicate(
    "ban is active (not soft-deleted)",
    ban.deleted_at === null || ban.deleted_at === undefined,
  );

  // Step 14: Validate appeal eligibility is in future
  if (ban.appeal_eligible_at) {
    const appealDate = new Date(ban.appeal_eligible_at);
    const now = new Date();
    TestValidator.predicate(
      "appeal eligible date is in the future",
      appealDate.getTime() > now.getTime(),
    );
  }
}
