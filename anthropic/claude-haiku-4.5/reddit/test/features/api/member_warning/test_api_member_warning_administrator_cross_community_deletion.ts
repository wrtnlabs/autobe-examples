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

export async function test_api_member_warning_administrator_cross_community_deletion(
  connection: api.IConnection,
) {
  // 1. Create administrator account with system-wide authority
  const administratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://example.com/auth",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create first moderator for community A
  const moderator1Email: string = typia.random<string & tags.Format<"email">>();
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: "ModeratorPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/auth",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // 3. Create second moderator for community B
  const moderator2Email: string = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: "ModeratorPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/auth",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // 4. Create member who will receive warnings
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "MemberPassword123!",
        href: "https://example.com/auth",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 5. Create category for communities
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: "AdminPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 6. Switch to member and create first community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  // 7. Create second community
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // 8. Create post in community1 for reporting
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  // 9. Create post in community2 for reporting
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community2.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // 10. Create reports for both posts
  const report1: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post1.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report1);

  const report2: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post2.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report2);

  // 11. Switch to moderator1 and create decision for report1
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: "ModeratorPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report1.id,
        body: {
          action_type: "issue_warning",
          reason: "Inappropriate harassment behavior in community",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // 12. Create warning for member in community1
  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision1.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // 13. Switch to moderator2 and create decision for report2
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "ModeratorPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision2: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "issue_warning",
          reason: "Spam content detected in community",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // 14. Create warning for member in community2
  const warning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision2.id,
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);

  // 15. Switch to administrator and verify system-wide authority
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: "AdminPassword123!",
      href: "https://example.com/auth",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 16. Administrator deletes first warning (issued in community1)
  const deletedWarning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warning1.id,
      },
    );
  typia.assert(deletedWarning1);
  TestValidator.equals(
    "first warning should be soft-deleted with timestamp",
    deletedWarning1.deletedAt !== null &&
      deletedWarning1.deletedAt !== undefined,
    true,
  );

  // 17. Administrator deletes second warning (issued in community2)
  const deletedWarning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.erase(
      connection,
      {
        warningId: warning2.id,
      },
    );
  typia.assert(deletedWarning2);
  TestValidator.equals(
    "second warning should be soft-deleted with timestamp",
    deletedWarning2.deletedAt !== null &&
      deletedWarning2.deletedAt !== undefined,
    true,
  );

  // 18. Validate deletion demonstrates cross-community authority
  TestValidator.predicate(
    "administrator successfully deleted warnings across multiple communities",
    deletedWarning1.deletedAt !== null &&
      deletedWarning2.deletedAt !== null &&
      deletedWarning1.id === warning1.id &&
      deletedWarning2.id === warning2.id,
  );
}
