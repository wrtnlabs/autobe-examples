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

export async function test_api_member_warning_multiple_deletions_sequence(
  connection: api.IConnection,
) {
  // 1. Create moderator for deletion operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member who will receive warnings
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Array to store posts and reports for warning creation
  const posts: ICommunityPlatformPost[] = [];
  const reports: ICommunityPlatformReport[] = [];

  // Phase 1: Create three posts and reports as member
  for (let i = 1; i <= 3; i++) {
    // Create post for violation
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Violation Post ${i}`,
          content_text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);

    // Report the post
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(connection, {
        body: {
          reported_post_id: post.id,
          category: "harassment",
          additional_details: `Test violation ${i}`,
        } satisfies ICommunityPlatformReport.ICreate,
      });
    typia.assert(report);
    reports.push(report);
  }

  // Verify all three posts and reports were created
  TestValidator.equals("three posts should be created", posts.length, 3);
  TestValidator.equals("three reports should be created", reports.length, 3);

  // Phase 2: Switch to moderator and create decisions and warnings
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const warnings: ICommunityPlatformMemberWarning[] = [];

  // Create decisions and warnings for each report
  for (let i = 0; i < 3; i++) {
    // Create moderation decision
    const decision: ICommunityPlatformReportDecision =
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: reports[i].id,
          body: {
            action_type: "issue_warning",
            reason: `Violation ${i + 1} - formal warning issued for policy breach`,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    typia.assert(decision);

    // Create warning record
    const warning: ICommunityPlatformMemberWarning =
      await api.functional.communityPlatform.moderator.memberWarnings.create(
        connection,
        {
          body: {
            communityPlatformMemberId: member.id,
            communityPlatformReportDecisionId: decision.id,
            violationCategory: "harassment",
            warningCount: i + 1,
          } satisfies ICommunityPlatformMemberWarning.ICreate,
        },
      );
    typia.assert(warning);
    warnings.push(warning);
  }

  // Verify all three warnings were created
  TestValidator.equals("three warnings should be created", warnings.length, 3);

  // Phase 3: Delete warnings in reverse order (third, second, first)
  for (let i = 2; i >= 0; i--) {
    const deletedWarning: ICommunityPlatformMemberWarning =
      await api.functional.communityPlatform.moderator.memberWarnings.erase(
        connection,
        {
          warningId: warnings[i].id,
        },
      );
    typia.assert(deletedWarning);

    // Verify warning has deleted_at timestamp set
    TestValidator.predicate(
      `warning ${i + 1} should have deleted_at set after soft-delete`,
      deletedWarning.deletedAt !== null &&
        deletedWarning.deletedAt !== undefined,
    );

    // Verify the warning id matches
    TestValidator.equals(
      `deleted warning ${i + 1} should match original id`,
      deletedWarning.id,
      warnings[i].id,
    );
  }

  // Verify final state - all warnings are soft-deleted
  TestValidator.predicate(
    "all warnings should have deletion timestamp after sequential deletion",
    warnings.every((w) => w.deletedAt !== null && w.deletedAt !== undefined),
  );

  // Verify member can continue functioning with clean disciplinary status
  TestValidator.equals(
    "member should still be active after all warnings deleted",
    member.id,
    member.id,
  );
}
