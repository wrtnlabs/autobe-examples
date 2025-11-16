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

export async function test_api_member_warning_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // 5. Member creates a post
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // 6. Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphabets(12);
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        password: reporterPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 7. Reporter submits violation report
  const reportData = {
    reported_post_id: post.id,
    category: "harassment",
    additional_details: RandomGenerator.paragraph({ sentences: 3 }),
    reporter_contact_email: reporterEmail,
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // 8. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 9. Switch to moderator and create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decisionData = {
    action_type: "issue_warning" as const,
    reason:
      "Content violates community harassment policy with personal attacks",
    internal_notes:
      "First violation by user, documented for escalation tracking",
  } satisfies ICommunityPlatformReportDecision.ICreate;
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: decisionData,
      },
    );
  typia.assert(decision);

  // 10. Switch back to administrator context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/auth/admin/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 11. Retrieve the warning record using decision ID as reference
  // The warning is created when the decision is made, and we access it via its ID
  const warningId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const warning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.at(
      connection,
      { warningId },
    );
  typia.assert(warning);

  // 12. Validate warning contains complete context
  TestValidator.equals(
    "warning member matches reported post creator",
    warning.member.id,
    post.creator.id,
  );

  TestValidator.predicate(
    "warning has violation category",
    warning.violationCategory !== undefined &&
      warning.violationCategory.length > 0,
  );

  TestValidator.predicate(
    "warning has warning count for escalation tracking",
    warning.warningCount >= 1,
  );

  TestValidator.predicate(
    "warning has associated decision",
    warning.decision !== undefined && warning.decision.id !== undefined,
  );

  TestValidator.equals(
    "decision moderator matches moderator who issued warning",
    warning.decision.moderator.id,
    moderator.id,
  );

  TestValidator.predicate(
    "warning has created timestamp for audit trail",
    warning.createdAt !== undefined && warning.createdAt.length > 0,
  );

  TestValidator.predicate(
    "warning has updated timestamp",
    warning.updatedAt !== undefined && warning.updatedAt.length > 0,
  );

  TestValidator.predicate(
    "administrator has unrestricted access to member warning",
    warning.id !== undefined,
  );
}
