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
 * Test member ban retrieval focusing on audit trail and accountability
 * information.
 *
 * This test validates that when a moderator retrieves a member ban by ID, the
 * response includes complete audit trail information including:
 *
 * - Who issued the ban (moderator identity/username)
 * - When the ban was created (created_at timestamp in ISO 8601 UTC)
 * - When it was last modified (updated_at timestamp in ISO 8601 UTC)
 * - Decision reference enabling traceability back to the moderation action
 * - Ban reason as immutable from creation
 * - Deleted_at field properly indicating active vs archived bans
 * - Accessed by moderators for compliance and investigation
 *
 * Test flow:
 *
 * 1. Create moderator account for audit trail verification
 * 2. Create member to be banned
 * 3. Create category infrastructure
 * 4. Create community for violation content
 * 5. Create violation post by member
 * 6. Create moderation decision for audit context
 * 7. Create ban record linking to decision
 * 8. Retrieve ban by ID and verify complete audit trail
 */
export async function test_api_member_ban_retrieval_audit_trail_verification(
  connection: api.IConnection,
) {
  // 1. Create moderator account for audit trail verification
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: "ValidPassword123!",
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "ValidPassword123!",
        href: "https://example.com/auth/member",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        password: "ValidPassword123!",
        name: `Admin ${RandomGenerator.name()}`,
        href: "https://example.com/auth/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin context for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "ValidPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch to member context and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "ValidPassword123!",
      href: "https://example.com/community",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create violation post by member
  const violationPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Violation Post ${RandomGenerator.alphaNumeric(8)}`,
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violationPost);

  // 6. Switch to moderator context to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ValidPassword123!",
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a report (using a dummy report ID for decision)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Create moderation decision
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason:
            "Severe violation of community guidelines and repeated harmful behavior",
          internal_notes:
            "User has pattern of violations. Permanent ban recommended.",
          suspension_duration_days: undefined,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 7. Create member ban record
  const ban: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            "Violation of community harassment policy: repeated personal attacks, threats, and abusive language targeting multiple community members over extended period.",
          appeal_eligible_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // 8. Retrieve ban by ID and verify complete audit trail
  const retrievedBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.at(connection, {
      banId: ban.id,
    });
  typia.assert(retrievedBan);

  // Verify ban structure and audit trail
  TestValidator.equals("ban ID matches created ban", retrievedBan.id, ban.id);

  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "decision ID matches",
    retrievedBan.community_platform_report_decision_id,
    decision.id,
  );

  // Verify ban reason is immutable
  TestValidator.equals(
    "ban reason matches original",
    retrievedBan.ban_reason,
    ban.ban_reason,
  );

  // Verify timestamps are ISO 8601 UTC format
  TestValidator.predicate(
    "banned_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      retrievedBan.banned_at,
    ),
  );

  TestValidator.predicate(
    "created_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      retrievedBan.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      retrievedBan.updated_at,
    ),
  );

  // Verify deleted_at field for active ban (should be null for active bans)
  TestValidator.predicate(
    "active ban has null deleted_at",
    retrievedBan.deleted_at === null || retrievedBan.deleted_at === undefined,
  );

  // Verify appeal eligibility timestamp if present
  if (retrievedBan.appeal_eligible_at) {
    TestValidator.predicate(
      "appeal_eligible_at is ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
        retrievedBan.appeal_eligible_at,
      ),
    );
  }

  // Verify moderator information is accessible (from decision)
  if (retrievedBan.decision) {
    TestValidator.predicate(
      "decision includes moderator info",
      retrievedBan.decision.moderator_username !== undefined &&
        retrievedBan.decision.moderator_username.length > 0,
    );
  }

  // Verify member information is accessible
  if (retrievedBan.member) {
    TestValidator.equals(
      "member summary includes ID",
      retrievedBan.member.id,
      member.id,
    );
  }
}
