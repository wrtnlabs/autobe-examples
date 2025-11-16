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

export async function test_api_member_warning_creation_escalation_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category as admin
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account who will receive warnings
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Switch back to admin to create community as admin, then login as member
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create community (as admin for setup simplicity)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Switch to member context to create post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

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

  // Step 6: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 7: Create first report as member, then switch to moderator for decision
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const firstReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(firstReport);

  // Switch to moderator for decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const firstDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: firstReport.id,
        body: {
          action_type: "issue_warning",
          reason:
            "First violation: harassment detected. This is the first warning.",
          internal_notes:
            "Member shows harassment behavior. Escalation level 1.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(firstDecision);

  // Create first warning with warningCount=1
  const firstWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: firstDecision.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(firstWarning);
  TestValidator.equals(
    "first warning warningCount should be 1",
    firstWarning.warningCount,
    1,
  );

  // Step 8: Create second report as member, then issue second warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const secondReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "off_topic",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(secondReport);

  // Switch to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const secondDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: secondReport.id,
        body: {
          action_type: "issue_warning",
          reason:
            "Second violation: off-topic content. This is the second warning.",
          internal_notes:
            "Member continues problematic behavior. Escalation level 2.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(secondDecision);

  // Create second warning with warningCount=2
  const secondWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: secondDecision.id,
          violationCategory: "off_topic",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(secondWarning);
  TestValidator.equals(
    "second warning warningCount should be 2",
    secondWarning.warningCount,
    2,
  );

  // Step 9: Create third report as member, then issue third warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const thirdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(thirdReport);

  // Switch to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const thirdDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: thirdReport.id,
        body: {
          action_type: "issue_warning",
          reason:
            "Third violation: spam content. This is the third warning and may trigger escalation.",
          internal_notes:
            "Member has received three warnings. Consider suspension for next violation.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(thirdDecision);

  // Create third warning with warningCount=3
  const thirdWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.moderator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: thirdDecision.id,
          violationCategory: "spam",
          warningCount: 3,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(thirdWarning);
  TestValidator.equals(
    "third warning warningCount should be 3",
    thirdWarning.warningCount,
    3,
  );

  // Step 10: Validate escalation progression
  TestValidator.predicate(
    "warning escalation tracking shows proper progression from 1st to 3rd warning",
    firstWarning.warningCount < secondWarning.warningCount &&
      secondWarning.warningCount < thirdWarning.warningCount,
  );

  TestValidator.predicate(
    "first warning should have correct violation category",
    firstWarning.violationCategory === "harassment",
  );

  TestValidator.predicate(
    "second warning should have correct violation category",
    secondWarning.violationCategory === "off_topic",
  );

  TestValidator.predicate(
    "third warning should have correct violation category",
    thirdWarning.violationCategory === "spam",
  );
}
