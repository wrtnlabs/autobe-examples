import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test the complete warning reversal workflow through moderator soft-delete of
 * a member warning.
 *
 * This test validates the disciplinary record management system where
 * moderators can remove warnings from a member's disciplinary history. The
 * scenario validates successful soft-deletion of an existing warning through
 * moderator action, proper timestamp setting, and preservation of complete
 * audit trails showing the reversal decision.
 *
 * Workflow:
 *
 * 1. Administrator creates a category for the community
 * 2. Member creates a community in the category
 * 3. Member creates a post in the community
 * 4. Another member reports the post for rule violation
 * 5. Moderator creates a moderation decision that issues a warning
 * 6. Warning record is created from the moderation decision
 * 7. Moderator soft-deletes the warning through the warning removal endpoint
 * 8. Verification that warning is marked as deleted with proper timestamp
 */
export async function test_api_member_warning_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category
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

  // Step 3: Create community creator member
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const communityCreator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphabets(12),
      password: "CreatorPassword123!",
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(communityCreator);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create reporting member
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reportingMember = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: RandomGenerator.alphabets(12),
      password: "ReporterPassword123!",
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reportingMember);

  // Step 7: Switch to reporting member and submit report
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: "ReporterPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "ModeratorPassword123!",
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 9: Moderator logs in and creates moderation decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 10 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 10: Create member warning from the moderation decision
  const warning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: reportingMember.id,
          communityPlatformReportDecisionId: decision.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning);

  TestValidator.predicate(
    "warning should be active initially with null deletedAt",
    warning.deletedAt === null || warning.deletedAt === undefined,
  );

  // Step 11: Soft-delete the warning through moderator action
  const deletedWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.erase(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(deletedWarning);

  // Step 12: Validate the soft-delete operation
  TestValidator.predicate(
    "warning should be soft-deleted with non-null deletedAt timestamp",
    deletedWarning.deletedAt !== null && deletedWarning.deletedAt !== undefined,
  );

  TestValidator.equals(
    "warning ID should remain unchanged after soft-delete",
    deletedWarning.id,
    warning.id,
  );

  TestValidator.equals(
    "member ID should remain unchanged after soft-delete",
    deletedWarning.member.id,
    warning.member.id,
  );

  TestValidator.equals(
    "violation category should remain unchanged after soft-delete",
    deletedWarning.violationCategory,
    warning.violationCategory,
  );

  TestValidator.equals(
    "warning count should remain unchanged after soft-delete",
    deletedWarning.warningCount,
    warning.warningCount,
  );

  // Step 13: Verify audit trail preservation
  TestValidator.equals(
    "decision reference should be preserved in soft-deleted warning",
    deletedWarning.decision.id,
    decision.id,
  );

  TestValidator.predicate(
    "soft-deleted warning audit trail is preserved",
    deletedWarning.createdAt === warning.createdAt,
  );
}
