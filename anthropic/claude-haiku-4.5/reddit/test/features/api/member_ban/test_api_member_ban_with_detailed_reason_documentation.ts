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
 * Test member ban creation with comprehensive reason documentation meeting
 * audit and compliance requirements.
 *
 * This test validates the ban creation workflow with emphasis on:
 *
 * 1. Detailed reason documentation (minimum 50 characters)
 * 2. Comprehensive violation context for appeals review
 * 3. Audit trail compliance for regulatory purposes
 * 4. Ban immutability and record integrity
 *
 * Note: This test focuses on the ban creation endpoint which requires a
 * pre-existing moderation decision. In a real workflow, the decision would
 * result from a report review process. This test validates that the ban reason
 * provides comprehensive documentation sufficient for ban recipients and
 * appeals review.
 */
export async function test_api_member_ban_with_detailed_reason_documentation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for ban authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator created successfully",
    administrator.id !== null,
  );

  // Step 2: Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology Discussion",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Community for technology-related discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.id !== null,
  );

  // Step 3: Create member account (will be banned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 4: Create community for violation context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 5: Create violation content (post by member)
  const violationPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Violation Post Title",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(violationPost);
  TestValidator.predicate(
    "violation post created successfully",
    violationPost.id !== null,
  );

  // Step 6: Create moderator account for decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );

  // Step 7: Create comprehensive ban reason documentation
  const banReasonWithDetails =
    "Member permanently banned from platform due to severe community standards violations. " +
    "Specific violations: (1) Posted derogatory content targeting protected groups on 2024-01-15, " +
    "(2) Engaged in harassment and personal attacks against other members on 2024-01-18, " +
    "(3) Violated community rules section 3.2 (Hate Speech Prohibition) and section 4.1 (Harassment Policy). " +
    "Pattern analysis: Member created 12 violation reports within 14 days, escalating from warnings to removals. " +
    "Prior moderation actions: Warning issued 2024-01-10, Content removed 2024-01-18. " +
    "This ban is permanent with appeal eligibility after 365 days. Appeal process documentation available at compliance portal.";

  TestValidator.predicate(
    "ban reason meets minimum 50 character requirement",
    banReasonWithDetails.length >= 50,
  );

  // Step 8: Create ban with comprehensive reason documentation
  const ban =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          ban_reason: banReasonWithDetails,
          appeal_eligible_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 9: Validate ban properties and reason immutability
  TestValidator.equals(
    "ban member ID matches",
    ban.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "ban reason is present and non-empty",
    ban.ban_reason.length > 0,
  );
  TestValidator.equals(
    "ban reason matches input (immutable)",
    ban.ban_reason,
    banReasonWithDetails,
  );

  // Step 10: Validate ban reason meets minimum documentation requirement
  TestValidator.predicate(
    "ban reason exceeds minimum 50 character requirement",
    ban.ban_reason.length >= 50,
  );

  // Step 11: Validate ban reason documents specific violations
  TestValidator.predicate(
    "ban reason documents specific violation types",
    ban.ban_reason.toLowerCase().includes("derogatory") ||
      ban.ban_reason.toLowerCase().includes("harassment"),
  );
  TestValidator.predicate(
    "ban reason documents pattern of behavior",
    ban.ban_reason.toLowerCase().includes("pattern") ||
      ban.ban_reason.toLowerCase().includes("escalating"),
  );
  TestValidator.predicate(
    "ban reason references applicable rules",
    ban.ban_reason.includes("section") ||
      ban.ban_reason.toLowerCase().includes("policy"),
  );

  // Step 12: Validate compliance documentation
  TestValidator.predicate(
    "ban reason documents prior moderation actions",
    ban.ban_reason.toLowerCase().includes("warning") ||
      ban.ban_reason.toLowerCase().includes("prior"),
  );
  TestValidator.predicate(
    "ban reason references audit trail",
    ban.ban_reason.includes("2024-") ||
      ban.ban_reason.toLowerCase().includes("date"),
  );

  // Step 13: Validate appeals review support
  TestValidator.predicate(
    "ban reason explicitly supports appeals review",
    ban.ban_reason.toLowerCase().includes("appeal"),
  );

  // Step 14: Validate ban record integrity and audit trail
  TestValidator.predicate("ban has unique identifier", ban.id !== null);
  TestValidator.predicate("ban has banned timestamp", ban.banned_at !== null);
  TestValidator.predicate(
    "ban has creation timestamp",
    ban.created_at !== null,
  );
  TestValidator.predicate("ban has update timestamp", ban.updated_at !== null);
  TestValidator.predicate(
    "ban creation timestamp is recent",
    new Date(ban.banned_at).getTime() > Date.now() - 60000,
  );

  // Step 15: Validate appeal eligibility for member context
  TestValidator.predicate(
    "ban appeal eligibility is documented",
    ban.appeal_eligible_at !== null,
  );
  TestValidator.predicate(
    "appeal eligible date is in future",
    new Date(ban.appeal_eligible_at!).getTime() > Date.now(),
  );

  // Step 16: Verify no soft-delete (ban is active)
  TestValidator.predicate(
    "ban is active (not soft-deleted)",
    ban.deleted_at === null || ban.deleted_at === undefined,
  );
}
