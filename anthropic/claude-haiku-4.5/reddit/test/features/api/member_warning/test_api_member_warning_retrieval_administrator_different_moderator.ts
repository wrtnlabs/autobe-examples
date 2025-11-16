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

export async function test_api_member_warning_retrieval_administrator_different_moderator(
  connection: api.IConnection,
) {
  // Setup: Create credentials for reuse in authentication
  const adminPassword = RandomGenerator.alphabets(12);
  const member1Password = RandomGenerator.alphabets(12);
  const member2Password = RandomGenerator.alphabets(12);
  const moderator1Password = RandomGenerator.alphabets(12);
  const moderator2Password = RandomGenerator.alphabets(12);

  // 1. Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/administrator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create first member who will receive warning
  const memberEmail1: string = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: RandomGenerator.name(1),
        password: member1Password,
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 4. Create second member (reporter)
  const memberEmail2: string = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: RandomGenerator.name(1),
        password: member2Password,
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 5. Create first moderator
  const moderator1Email: string = typia.random<string & tags.Format<"email">>();
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: RandomGenerator.name(1),
        password: moderator1Password,
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // 6. Create second moderator
  const moderator2Email: string = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: RandomGenerator.name(1),
        password: moderator2Password,
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // 7. Create community (login as member1 first)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: member1Password,
      href: "http://localhost:3000/auth/member/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 8. Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 9. Switch to member2 and create report
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail2,
      password: member2Password,
      href: "http://localhost:3000/auth/member/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 10. Switch to moderator1 and issue decision/warning
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: moderator1Password,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: "Content violates community guidelines regarding spam",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // 11. Create second post and report for second moderator decision
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: member1Password,
      href: "http://localhost:3000/auth/member/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail2,
      password: member2Password,
      href: "http://localhost:3000/auth/member/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report2: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post2.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report2);

  // 12. Switch to moderator2 and issue different warning
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision2: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "issue_warning",
          reason: "Content violates community guidelines regarding harassment",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // 13. Switch back to administrator and retrieve warnings by decision IDs
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/auth/administrator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 14. Retrieve first warning using decision1 ID
  const retrievedWarning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.at(
      connection,
      {
        warningId: decision1.id,
      },
    );
  typia.assert(retrievedWarning1);

  // Verify warning1 details including moderator attribution
  TestValidator.equals(
    "warning 1 issued to member1",
    retrievedWarning1.member.id,
    member1.id,
  );
  TestValidator.equals(
    "warning 1 issued by moderator1",
    retrievedWarning1.decision.moderator.id,
    moderator1.id,
  );

  // 15. Retrieve second warning using decision2 ID
  const retrievedWarning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.at(
      connection,
      {
        warningId: decision2.id,
      },
    );
  typia.assert(retrievedWarning2);

  // Verify warning2 details including different moderator attribution
  TestValidator.equals(
    "warning 2 issued to member1",
    retrievedWarning2.member.id,
    member1.id,
  );
  TestValidator.equals(
    "warning 2 issued by moderator2",
    retrievedWarning2.decision.moderator.id,
    moderator2.id,
  );

  // 16. Verify administrator can access both warnings from different moderators
  TestValidator.predicate(
    "moderator1 issued first warning",
    retrievedWarning1.decision.moderator.id === moderator1.id,
  );

  TestValidator.predicate(
    "moderator2 issued second warning",
    retrievedWarning2.decision.moderator.id === moderator2.id,
  );

  TestValidator.equals(
    "both warnings for same member",
    retrievedWarning1.member.id,
    retrievedWarning2.member.id,
  );

  TestValidator.notEquals(
    "warnings from different moderators",
    retrievedWarning1.decision.moderator.id,
    retrievedWarning2.decision.moderator.id,
  );
}
