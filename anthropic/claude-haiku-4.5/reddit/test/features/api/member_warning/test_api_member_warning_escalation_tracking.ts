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

export async function test_api_member_warning_escalation_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create test actors with different roles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(12);

  // Create member account
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: memberPassword,
      href: "http://localhost:3000/auth/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Create moderator account
  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(moderatorAccount);

  // Create administrator account
  const administratorAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: administratorEmail,
        username: RandomGenerator.name(1),
        password: administratorPassword,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/administrator/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administratorAccount);

  // Step 2: Login as administrator to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Login as member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4, 5, 6: First violation cycle - create post, report, and issue first warning
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  // Report first post
  const report1 = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post1.id,
        category: "harassment",
        additional_details: "Inappropriate content",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report1);

  // Login as moderator to make decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Moderator creates decision for first report (issue_warning)
  const decision1 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report1.id,
        body: {
          action_type: "issue_warning",
          reason: "First violation: harassment in post",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  // Login as administrator to create first warning
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create first warning with warningCount=1
  const warning1 =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: memberAccount.id,
          communityPlatformReportDecisionId: decision1.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);
  TestValidator.equals("first warning count", warning1.warningCount, 1);

  // Step 7, 8: Second violation cycle - create post, report, and issue second warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // Report second post
  const report2 = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post2.id,
        category: "harassment",
        additional_details: "Another violation",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report2);

  // Login as moderator and create decision for second report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision2 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "issue_warning",
          reason: "Second violation: repeated harassment",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  // Login as administrator and create second warning with warningCount=2
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const warning2 =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: memberAccount.id,
          communityPlatformReportDecisionId: decision2.id,
          violationCategory: "harassment",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);
  TestValidator.equals("second warning count", warning2.warningCount, 2);

  // Step 9, 10, 11: Third violation cycle - create post, report, and issue third warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post3 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post3);

  // Report third post
  const report3 = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post3.id,
        category: "harassment",
        additional_details: "Third violation",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report3);

  // Login as moderator and create decision for third report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision3 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report3.id,
        body: {
          action_type: "issue_warning",
          reason: "Third violation: persistent harassment behavior",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision3);

  // Login as administrator and create third warning with warningCount=3
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const warning3 =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: memberAccount.id,
          communityPlatformReportDecisionId: decision3.id,
          violationCategory: "harassment",
          warningCount: 3,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3);
  TestValidator.equals("third warning count", warning3.warningCount, 3);

  // Verify escalation progression
  TestValidator.predicate("warning escalation tracking", () => {
    return (
      warning1.warningCount === 1 &&
      warning2.warningCount === 2 &&
      warning3.warningCount === 3
    );
  });
}
