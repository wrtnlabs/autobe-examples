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

export async function test_api_member_warning_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);

  // Step 2: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: `test_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to be warned
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Step 4: Create moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(moderatorAccount);

  // Step 5: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 7: Test different violation categories
  const violationCategories = [
    "spam",
    "harassment",
    "off_topic",
    "misinformation",
    "commercial_spam",
    "impersonation",
    "hate_speech",
    "self_harm_content",
    "graphic_violence",
    "sexual_content",
    "doxxing",
    "brigading",
  ] as const;

  for (const violationCategory of violationCategories) {
    // Create report with specific violation category
    const report = await api.functional.communityPlatform.member.reports.create(
      connection,
      {
        body: {
          reported_post_id: post.id,
          category: violationCategory,
          additional_details: `Testing violation category: ${violationCategory}`,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
    typia.assert(report);

    // Create moderator decision
    const decision =
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report.id,
          body: {
            action_type: "issue_warning",
            reason: `Warning issued for ${violationCategory} violation`,
            internal_notes: `Testing category validation for ${violationCategory}`,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    typia.assert(decision);

    // Create member warning with the violation category
    const warning =
      await api.functional.communityPlatform.administrator.memberWarnings.create(
        connection,
        {
          body: {
            communityPlatformMemberId: memberAccount.id,
            communityPlatformReportDecisionId: decision.id,
            violationCategory: violationCategory,
            warningCount: 1,
          } satisfies ICommunityPlatformMemberWarning.ICreate,
        },
      );
    typia.assert(warning);

    // Validate the warning contains the correct violation category
    TestValidator.equals(
      `warning violation category should be ${violationCategory}`,
      warning.violationCategory,
      violationCategory,
    );
  }

  // Step 8: Verify warnings with different violation categories
  TestValidator.predicate(
    "all violation categories tested successfully",
    violationCategories.length === 12,
  );
}
