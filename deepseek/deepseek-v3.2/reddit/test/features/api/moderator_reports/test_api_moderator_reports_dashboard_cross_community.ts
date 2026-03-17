import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test multi-community moderation with role-based access control.
 *
 * Scenario: 1) User A creates community 1 and becomes owner (moderator).
 * 2) User B creates community 2 and becomes owner.
 * 3) User C (reporter) subscribes to both communities and creates posts.
 * 4) Reporter creates reports in both communities.
 * 5) User A adds User B as moderator in community 2.
 * 6) User B fetches dashboard expecting to see reports from both community 1 (no) and community 2 (yes).
 * Validate: dashboard only includes reports from communities where user B has moderator role (community 2).
 * Edge case: test cross-community access prevention, verify user B cannot see reports from community 1 where they have no moderation role.
 * Validate community stats aggregates only for community 2.
 */
export async function test_api_moderator_reports_dashboard_cross_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user A (owner of community 1)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(userA);
  // 2. Create community 1 with user A as owner
  const community1 =
    await generate_random_community_platform_member_communities_create(
      userAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community1);
  // 3. Create user B (owner of community 2)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.alphabets(8),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(userB);
  // 4. Create community 2 with user B as owner
  const community2 =
    await generate_random_community_platform_member_communities_create(
      userBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community2);
  // 5. Create user C (reporter)
  const userCConnection: api.IConnection = { host: connection.host };
  const userC = await authorize_member_join(userCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password789",
      username: RandomGenerator.alphabets(8),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(userC);
  // 6. Reporter subscribes to both communities
  await generate_random_community_platform_member_subscriptions_create(
    userCConnection,
    {
      body: {
        community_id: community1.id,
        active: true,
      } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
    },
  );
  await generate_random_community_platform_member_subscriptions_create(
    userCConnection,
    {
      body: {
        community_id: community2.id,
        active: true,
      } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
    },
  );
  // 7. Create post in community 1 (by reporter)
  const post1 = await generate_random_community_platform_member_posts_create(
    userCConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community1.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post1);
  // 8. Create post in community 2 (by reporter)
  const post2 = await generate_random_community_platform_member_posts_create(
    userCConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community2.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post2);
  // 9. Create report on post in community 1
  const report1 =
    await generate_random_community_platform_member_reports_create(
      userCConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: post1.id,
          commentId: null,
        } satisfies DeepPartial<ICommunityPlatformContentReport.ICreate>,
      },
    );
  typia.assert(report1);
  // 10. Create report on post in community 2
  const report2 =
    await generate_random_community_platform_member_reports_create(
      userCConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          postId: post2.id,
          commentId: null,
        } satisfies DeepPartial<ICommunityPlatformContentReport.ICreate>,
      },
    );
  typia.assert(report2);
  // 11. User A adds User B as moderator in community 2
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      userAConnection,
      {
        params: { communityId: community2.id },
        body: {
          memberId: userB.id,
          roleType: "moderator",
        } satisfies DeepPartial<ICommunityPlatformModerationRole.ICreate>,
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals("role type", moderationRole.roleType, "moderator");
  TestValidator.equals("member id", moderationRole.member.id, userB.id);
  TestValidator.equals(
    "community id",
    moderationRole.community.id,
    community2.id,
  );
  // 12. User B fetches moderator reports dashboard
  const dashboard =
    await api.functional.communityPlatform.member.moderators.reports.dashboard(
      userBConnection,
    );
  typia.assert(dashboard);
  // 13. Validate dashboard content
  TestValidator.predicate(
    "dashboard should contain reports",
    dashboard.data.length > 0,
  );
  // Verify all reports in dashboard belong to community 2 only
  for (const report of dashboard.data) {
    TestValidator.equals(
      `report ${report.id} community matches community2`,
      report.community.id,
      community2.id,
    );
    TestValidator.notEquals(
      `report ${report.id} not from community1`,
      report.community.id,
      community1.id,
    );
  }
  // Verify community stats aggregates only for community 2
  const communityIdsInStats = new Set(
    dashboard.data.map((report) => report.community_stats),
  );
  TestValidator.equals(
    "only one community represented in stats",
    communityIdsInStats.size,
    1,
  );
  // Verify dashboard contains report2 (community2) but not report1 (community1)
  const reportIds = dashboard.data.map((report) => report.id);
  TestValidator.predicate(
    "dashboard contains report from community2",
    reportIds.includes(report2.id),
  );
  TestValidator.predicate(
    "dashboard does not contain report from community1",
    !reportIds.includes(report1.id),
  );
  // Validate cross-community access prevention
  TestValidator.equals(
    "dashboard data length should be 1 (only community2 reports)",
    dashboard.data.length,
    1,
  );
}
