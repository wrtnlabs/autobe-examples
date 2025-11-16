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

export async function test_api_member_warning_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Create member account for testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create administrator account for category creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 3. Switch to admin and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch back to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post for violation reporting
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create a report for the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "Violates community guidelines",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 7. Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: moderatorPassword,
        href: "https://example.com/moderator-register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 8. Switch to moderator and create decision to issue warning
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "User violated community harassment policy with inappropriate content",
          internal_notes: "First warning for this member",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 9. Switch to admin and create warning record
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin-login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const warning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
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

  // 10. Switch back to member and retrieve the warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const retrievedWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.member.memberWarnings.at(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(retrievedWarning);

  // 11. Validate warning details match the created warning
  TestValidator.equals(
    "warning ID matches created warning",
    retrievedWarning.id,
    warning.id,
  );
  TestValidator.equals(
    "warning member ID matches",
    retrievedWarning.member.id,
    member.id,
  );
  TestValidator.equals(
    "warning violation category matches",
    retrievedWarning.violationCategory,
    "harassment",
  );
  TestValidator.equals(
    "warning count matches",
    retrievedWarning.warningCount,
    1,
  );
  TestValidator.predicate(
    "warning has decision information",
    retrievedWarning.decision !== null &&
      retrievedWarning.decision !== undefined,
  );
  TestValidator.predicate(
    "warning creation timestamp is valid",
    retrievedWarning.createdAt !== null &&
      retrievedWarning.createdAt !== undefined,
  );
}
