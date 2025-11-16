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

export async function test_api_member_warning_retrieval_deleted_warning(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for accessing warning records
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: `category-${RandomGenerator.alphabets(8)}`,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (who will receive warning)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community for posting content
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post by member
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

  // Step 6: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 7: Create report against the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "Inappropriate content",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Switch to moderator and create warning decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.equals(
    "decision action type should be issue_warning",
    decision.action_type,
    "issue_warning",
  );

  // Step 9: Switch back to administrator to retrieve warning
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 10: Retrieve warning record using decision ID
  // The warning is created as part of the decision with action_type "issue_warning"
  const warning =
    await api.functional.communityPlatform.administrator.memberWarnings.at(
      connection,
      {
        warningId: decision.id,
      },
    );
  typia.assert(warning);

  // Step 11: Validate warning structure and member reference
  TestValidator.equals(
    "warning member ID should match the warned member",
    warning.member.id,
    member.id,
  );
  TestValidator.equals(
    "warning violation category should be harassment",
    warning.violationCategory,
    "harassment",
  );
  TestValidator.predicate(
    "warning count should be at least 1",
    warning.warningCount >= 1,
  );

  // Step 12: Validate warning timestamps
  TestValidator.equals(
    "warning should have valid creation timestamp",
    typeof warning.createdAt,
    "string",
  );
  TestValidator.equals(
    "warning should have valid update timestamp",
    typeof warning.updatedAt,
    "string",
  );

  // Step 13: Validate soft-delete state
  TestValidator.predicate(
    "warning deletedAt should be null or ISO string",
    warning.deletedAt === null || typeof warning.deletedAt === "string",
  );

  // Step 14: Verify decision reference in warning
  TestValidator.equals(
    "warning decision should reference the correct report",
    warning.decision.report.id,
    report.id,
  );

  // Step 15: Verify that warning remains accessible for audit trail purposes
  const retrievedWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.at(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(retrievedWarning);

  // Step 16: Confirm warning data consistency on retrieval
  TestValidator.equals(
    "retrieved warning member should match original",
    retrievedWarning.member.id,
    warning.member.id,
  );
  TestValidator.equals(
    "retrieved warning violation category should remain consistent",
    retrievedWarning.violationCategory,
    warning.violationCategory,
  );
  TestValidator.equals(
    "retrieved warning count should remain consistent",
    retrievedWarning.warningCount,
    warning.warningCount,
  );
  TestValidator.equals(
    "retrieved warning creation timestamp should match",
    retrievedWarning.createdAt,
    warning.createdAt,
  );
}
