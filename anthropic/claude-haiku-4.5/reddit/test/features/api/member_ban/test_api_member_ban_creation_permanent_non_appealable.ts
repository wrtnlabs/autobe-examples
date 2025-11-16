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

export async function test_api_member_ban_creation_permanent_non_appealable(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to manage bans
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/auth/admin",
        referrer: "https://example.com/",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create member account to be permanently banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(12),
        password: "MemberPassword123!",
        href: "https://example.com/auth/member",
        referrer: "https://example.com/",
        ip: "192.168.1.2",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create category for community structure
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Violations",
          slug: `violations-${RandomGenerator.alphaNumeric(8)}`,
          description: "Category for violation tracking",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community where violation occurred
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for testing ban operations",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post with violation content
  const violationPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Severe Violation Content",
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violationPost);

  // Step 6: Create moderator account for decision making
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(12),
        password: "ModeratorPassword123!",
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com/",
        ip: "192.168.1.3",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 7: Create report decision for permanent ban
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId,
        body: {
          action_type: "ban_user",
          reason:
            "Permanent ban for severe and repeated violations of community guidelines including harassment, hate speech, and threats. This member has engaged in behavior that poses a risk to community integrity. No appeal period is granted due to severity.",
          internal_notes:
            "Multiple severe violations documented. User previously warned but continued violations. Permanent ban is appropriate and necessary.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 8: Create permanent, non-appealable member ban
  const permanentBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            "Permanent ban issued for severe violations of community standards. This member has engaged in harassment, hate speech, and multiple policy breaches. This ban is permanent and non-appealable due to the severity and pattern of violations. The member has demonstrated unwillingness to comply with community guidelines despite prior warnings and moderation actions.",
          appeal_eligible_at: null,
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 9: Validate permanent, non-appealable ban
  TestValidator.equals(
    "permanent ban should have null appeal_eligible_at confirming non-appealable status",
    permanentBan.appeal_eligible_at,
    null,
  );

  TestValidator.predicate(
    "ban reason must be detailed and substantial (minimum 50 characters)",
    permanentBan.ban_reason.length >= 50,
  );

  TestValidator.equals(
    "ban must reference the correct member being banned",
    permanentBan.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "ban must reference the correct moderation decision",
    permanentBan.community_platform_report_decision_id,
    decision.id,
  );

  TestValidator.predicate(
    "ban timestamp must be set indicating when ban took effect",
    permanentBan.banned_at !== null && permanentBan.banned_at !== undefined,
  );

  TestValidator.predicate(
    "soft-delete timestamp should be null for active ban",
    permanentBan.deleted_at === null || permanentBan.deleted_at === undefined,
  );
}
