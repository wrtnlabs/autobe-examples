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
 * Test platform administrator deletion of member warnings with system-wide
 * authority.
 *
 * This test validates that administrators can soft-delete member warnings
 * across any community without requiring community-specific permission. It
 * follows a complete workflow from warning issuance to administrator deletion,
 * confirming the soft-delete pattern preserves audit trails while removing the
 * warning from active consideration.
 *
 * Test flow:
 *
 * 1. Create administrator, moderator, and member accounts
 * 2. Set up community with category
 * 3. Create post that triggers violation
 * 4. Submit report for violation
 * 5. Moderator makes decision and issues warning
 * 6. Administrator retrieves and soft-deletes the warning
 * 7. Verify deleted_at timestamp is set and warning is properly soft-deleted
 */
export async function test_api_member_warning_administrator_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://community.example.com/admin/register",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator account should be created",
    admin.id !== undefined,
  );

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(8),
        href: "https://community.example.com/moderator/register",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create member account who will receive the warning
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to administrator for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community.example.com/admin/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 4: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Submit violation report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post violates community guidelines",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Switch to moderator for decision making
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Moderator makes decision and issues warning
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "The post contains content that violates community harassment policy",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 9: Create warning record
  const warning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning);
  TestValidator.predicate(
    "warning should be created with no deletion timestamp",
    warning.deletedAt === null || warning.deletedAt === undefined,
  );

  // Switch to administrator for deletion
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community.example.com/admin/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 10: Administrator soft-deletes the warning
  const deletedWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(deletedWarning);

  // Step 11: Validate soft-delete was performed
  TestValidator.predicate(
    "deleted warning should have deletedAt timestamp",
    deletedWarning.deletedAt !== null && deletedWarning.deletedAt !== undefined,
  );
  TestValidator.notEquals(
    "deleted_at timestamp should be set after deletion",
    deletedWarning.deletedAt,
    warning.deletedAt,
  );

  // Step 12: Verify warning data is preserved for audit trail
  TestValidator.equals(
    "warning id should remain the same",
    deletedWarning.id,
    warning.id,
  );
  TestValidator.equals(
    "member reference should be preserved",
    deletedWarning.member.id,
    member.id,
  );
  TestValidator.equals(
    "violation category should be preserved",
    deletedWarning.violationCategory,
    warning.violationCategory,
  );
}
