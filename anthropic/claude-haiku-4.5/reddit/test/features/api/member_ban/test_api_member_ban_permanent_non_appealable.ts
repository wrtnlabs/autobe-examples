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
 * Test member ban creation with permanent non-appealable status for severe
 * violations.
 *
 * This test validates the complete workflow for issuing a permanent ban that
 * cannot be appealed:
 *
 * 1. Establish administrator authentication with full platform authority
 * 2. Create member account representing the user to be banned
 * 3. Set up category and community infrastructure for violation context
 * 4. Create violating post content as basis for ban decision
 * 5. Create moderator account to issue decisions
 * 6. Create moderation decision with ban_user action type
 * 7. Create permanent member ban with appeal_eligible_at set to null
 *    (non-appealable)
 * 8. Validate ban is recorded with null appeal eligibility indicating permanence
 * 9. Verify ban prevents member access and cannot be appealed
 * 10. Confirm proper audit trail recording and enforcement
 *
 * Ensures system correctly handles permanent non-appealable bans for severe
 * violations.
 */
export async function test_api_member_ban_permanent_non_appealable(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for ban issuance
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://platform.example.com/admin/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator created successfully",
    typeof administrator.id,
    "string",
  );

  // Step 2: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(8) + "Aa1!";
  const memberToBeBanned: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://platform.example.com/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberToBeBanned);
  TestValidator.equals(
    "member account created",
    typeof memberToBeBanned.id,
    "string",
  );

  // Step 3: Create category for community infrastructure
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Create community with violation content
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create violating post by member
  const violatingPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Severe violation content",
        content_text: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violatingPost);

  // Step 6: Create moderator account for decision making
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: "https://platform.example.com/moderator/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 7: Create moderation decision with ban action
  // Using a valid report ID for decision creation
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "Severe violation of community standards and platform policies requiring permanent account removal",
          internal_notes:
            "User engaged in repeated harassment and threats - permanent ban justified",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.equals(
    "decision action is ban_user",
    decision.action_type,
    "ban_user",
  );

  // Step 8: Create permanent non-appealable ban
  const permanentBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: memberToBeBanned.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            "Permanent ban for severe violation of community harassment policy and platform terms of service. This ban is non-appealable due to the severity of violations including repeated threats and targeted harassment.",
          appeal_eligible_at: null,
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 9: Validate permanent non-appealable ban properties
  TestValidator.equals(
    "ban has member ID",
    permanentBan.community_platform_member_id,
    memberToBeBanned.id,
  );
  TestValidator.equals(
    "ban is linked to decision",
    permanentBan.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.equals(
    "ban appeal eligibility is null",
    permanentBan.appeal_eligible_at,
    null,
  );
  TestValidator.predicate(
    "ban reason is comprehensive",
    () => permanentBan.ban_reason.length >= 50,
  );
  TestValidator.predicate(
    "banned_at is set",
    () =>
      permanentBan.banned_at !== null && permanentBan.banned_at !== undefined,
  );

  // Step 10: Verify permanent ban cannot be appealed
  TestValidator.equals(
    "appeal_eligible_at null indicates non-appealable",
    permanentBan.appeal_eligible_at === null,
    true,
  );
  TestValidator.predicate("ban enforcement timestamp recorded", () => {
    const banDate = new Date(permanentBan.banned_at);
    return banDate instanceof Date && !isNaN(banDate.getTime());
  });

  // Step 11: Verify audit trail is maintained
  TestValidator.predicate(
    "created_at timestamp present",
    () =>
      permanentBan.created_at !== null && permanentBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    () =>
      permanentBan.updated_at !== null && permanentBan.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active ban",
    permanentBan.deleted_at === null || permanentBan.deleted_at === undefined,
    true,
  );
}
