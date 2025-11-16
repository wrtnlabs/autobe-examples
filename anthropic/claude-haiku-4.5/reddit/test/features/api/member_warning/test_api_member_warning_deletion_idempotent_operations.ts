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

export async function test_api_member_warning_deletion_idempotent_operations(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for deletion operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create member account with violations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "MemberPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create moderator account for issuing warning decision
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

  // Step 4: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create post by member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 7: Report the post for violation
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Switch to moderator and issue warning decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: "Harassment violation detected in post content",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 9: Create member warning record
  const warning =
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

  // Step 10: Switch to administrator for deletion
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 11: Delete the warning (first deletion)
  const deletedWarning1 =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(deletedWarning1);

  // Step 12: Verify warning has deleted_at timestamp
  TestValidator.predicate(
    "first deletion should set deleted_at timestamp",
    deletedWarning1.deletedAt !== null &&
      deletedWarning1.deletedAt !== undefined,
  );

  // Store the original deleted_at timestamp for comparison
  const originalDeletedAt = typia.assert<string>(deletedWarning1.deletedAt!);

  // Step 13: Delete the same warning again (second deletion - idempotent)
  const deletedWarning2 =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(deletedWarning2);

  // Step 14: Verify warning deleted_at timestamp remains unchanged
  const secondDeletedAt = typia.assert<string>(deletedWarning2.deletedAt!);
  TestValidator.equals(
    "second deletion should not change deleted_at timestamp",
    secondDeletedAt,
    originalDeletedAt,
  );

  // Step 15: Verify idempotent behavior - delete a third time
  const deletedWarning3 =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(deletedWarning3);

  // Step 16: Verify timestamp still matches original
  const thirdDeletedAt = typia.assert<string>(deletedWarning3.deletedAt!);
  TestValidator.equals(
    "third deletion should maintain original deleted_at timestamp",
    thirdDeletedAt,
    originalDeletedAt,
  );

  // Step 17: Validate that all deletions returned the warning with the same state
  TestValidator.equals(
    "all deletion responses should have same warning id",
    deletedWarning1.id,
    deletedWarning2.id,
  );

  TestValidator.equals(
    "all deletion responses should have same warning id",
    deletedWarning2.id,
    deletedWarning3.id,
  );
}
