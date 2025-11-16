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

export async function test_api_member_warning_retrieval_by_moderator_cross_community(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (content creator)
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(10);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: RandomGenerator.alphabets(8),
        password: member1Password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in community
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

  // Step 6: Create second member (reporter)
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(10);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: RandomGenerator.alphabets(8),
        password: member2Password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 7: Report the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: memberEmail2,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 8: Create moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 9: Moderator login to process decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 10: Create moderation decision with warning
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 11: Retrieve warning by ID
  // The warning ID corresponds to the decision ID in the system
  const warningId = decision.id;

  const warning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.at(
      connection,
      {
        warningId: warningId,
      },
    );
  typia.assert(warning);

  // Step 12: Validate warning contains complete context
  TestValidator.equals(
    "warning member ID matches reported post creator",
    warning.member.id,
    post.creator.id,
  );

  TestValidator.predicate(
    "warning has violation category",
    warning.violationCategory !== null &&
      warning.violationCategory !== undefined &&
      warning.violationCategory.length > 0,
  );

  TestValidator.predicate(
    "warning count is at least 1",
    warning.warningCount >= 1,
  );

  TestValidator.predicate(
    "warning has decision attached",
    warning.decision !== null && warning.decision !== undefined,
  );

  TestValidator.predicate(
    "decision reason is documented",
    warning.decision.reason.length >= 10,
  );

  TestValidator.equals(
    "decision action type is warning",
    warning.decision.action_type,
    "issue_warning",
  );

  TestValidator.predicate(
    "warning has creation timestamp",
    warning.createdAt !== null && warning.createdAt !== undefined,
  );

  TestValidator.predicate(
    "warning shows moderator in decision",
    warning.decision.moderator !== null &&
      warning.decision.moderator !== undefined,
  );

  TestValidator.equals(
    "moderator in decision matches decision maker",
    warning.decision.moderator.id,
    moderator.id,
  );
}
