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

/**
 * Test that warnings are created with correct violation categories from the
 * moderation decision.
 *
 * Different violation categories (spam, harassment, off_topic, misinformation,
 * etc.) should be properly assigned to warnings based on the report context.
 * This test:
 *
 * 1. Creates multiple actors: administrator, member, and moderator
 * 2. Sets up a category and community
 * 3. Creates posts in the community
 * 4. Submits reports with different violation categories
 * 5. Issues moderator decisions with matching violation categories
 * 6. Creates member warnings from decisions
 * 7. Validates the violationCategory field matches the decision category
 * 8. Confirms warnings are created with correct escalation counts
 */
export async function test_api_member_warning_creation_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "AdminPassword123!";
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/auth/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin connection
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/auth/admin",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 2: Create a category as admin
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = "MemberPassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        href: "http://localhost:3000/auth/member",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member connection
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/member",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community as member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create posts with different content
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Spam Post Title",
        content_text: "BUY NOW!!! FREE MONEY!!! CLICK HERE!!!",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Harassment Content",
        content_text: "This is mean content targeting someone",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Off Topic Discussion",
        content_text: "This is completely off topic for this community",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  const post4: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "False Information",
        content_text:
          "This contains completely false and misleading information",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post4);

  // Step 6: Create reports with different violation categories
  const report1: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post1.id,
        category: "spam",
        additional_details: "This is spam content advertising products",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report1);

  const report2: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post2.id,
        category: "harassment",
        additional_details: "This post contains harassing content",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report2);

  const report3: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post3.id,
        category: "off_topic",
        additional_details: "This content is off topic for this community",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report3);

  const report4: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post4.id,
        category: "misinformation",
        additional_details: "This post contains false information",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report4);

  // Step 7: Create moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword = "ModeratorPassword123!";
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
        href: "http://localhost:3000/auth/moderator",
        referrer: "",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator connection
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator",
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create moderation decisions with matching violation categories
  const decision1: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report1.id,
        body: {
          action_type: "issue_warning",
          reason: "This post violates spam policy by promoting products",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision1);

  const decision2: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "issue_warning",
          reason: "This post violates harassment policy",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  const decision3: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report3.id,
        body: {
          action_type: "issue_warning",
          reason: "This post is off topic for this community",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision3);

  const decision4: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report4.id,
        body: {
          action_type: "issue_warning",
          reason: "This post contains misinformation and false claims",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision4);

  // Step 9: Create member warnings from decisions
  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision1.id,
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);
  TestValidator.equals(
    "spam violation category matches",
    warning1.violationCategory,
    "spam",
  );

  const warning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision2.id,
          violationCategory: "harassment",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);
  TestValidator.equals(
    "harassment violation category matches",
    warning2.violationCategory,
    "harassment",
  );

  const warning3: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision3.id,
          violationCategory: "off_topic",
          warningCount: 3,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3);
  TestValidator.equals(
    "off_topic violation category matches",
    warning3.violationCategory,
    "off_topic",
  );

  const warning4: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision4.id,
          violationCategory: "misinformation",
          warningCount: 4,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning4);
  TestValidator.equals(
    "misinformation violation category matches",
    warning4.violationCategory,
    "misinformation",
  );

  // Step 10: Validate all warnings have correct violation categories and escalation counts
  TestValidator.predicate(
    "warning1 category is from predefined list",
    ["spam", "harassment", "off_topic", "misinformation"].includes(
      warning1.violationCategory,
    ),
  );

  TestValidator.predicate(
    "warning2 category is from predefined list",
    ["spam", "harassment", "off_topic", "misinformation"].includes(
      warning2.violationCategory,
    ),
  );

  TestValidator.predicate(
    "warning3 category is from predefined list",
    ["spam", "harassment", "off_topic", "misinformation"].includes(
      warning3.violationCategory,
    ),
  );

  TestValidator.predicate(
    "warning4 category is from predefined list",
    ["spam", "harassment", "off_topic", "misinformation"].includes(
      warning4.violationCategory,
    ),
  );

  TestValidator.equals(
    "warning1 escalation count is 1",
    warning1.warningCount,
    1,
  );

  TestValidator.equals(
    "warning2 escalation count is 2",
    warning2.warningCount,
    2,
  );

  TestValidator.equals(
    "warning3 escalation count is 3",
    warning3.warningCount,
    3,
  );

  TestValidator.equals(
    "warning4 escalation count is 4",
    warning4.warningCount,
    4,
  );
}
