import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformDashboard";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_admin_moderator_dashboard_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Setup: Create a separate member to create community B
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberResult);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // Step 2: Create community A (admin is owner)
  const communityA =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: "Community A for testing moderation isolation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // Step 3: Create community B (member is owner, not admin)
  const communityB =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: "Community B for testing moderation isolation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // Step 4: Add member as moderator to community A (admin cannot add themselves)
  await api.functional.redditPlatform.member.communities.moderators.add(
    adminConnection,
    {
      communityId: communityA.id,
      body: {
        user_id: memberResult.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // Step 5: Create pending report in community A (submitted by member)
  const reportInCommunityA =
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: communityA.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Spam content violating community guidelines",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(reportInCommunityA);
  // Step 6: Create pending report in community B (submitted by member)
  const reportInCommunityB =
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: communityB.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Inappropriate content",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(reportInCommunityB);
  // Step 7: Create ban in community A (member as moderator)
  const banInCommunityA =
    await api.functional.redditPlatform.member.communities.bans.create(
      memberConnection,
      {
        communityId: communityA.id,
        body: {
          user_id: adminResult.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banInCommunityA);
  // Step 8: Create ban in community B (member as owner)
  const banInCommunityB =
    await api.functional.redditPlatform.member.communities.bans.create(
      memberConnection,
      {
        communityId: communityB.id,
        body: {
          user_id: adminResult.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banInCommunityB);
  // Step 9: Get admin dashboard
  const dashboard =
    await api.functional.redditPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Validation: Verify data isolation - community stats should only include community A
  TestValidator.equals(
    "community stats length should be 1 (only community A)",
    dashboard.communityStats.length,
    1,
  );
  TestValidator.equals(
    "community stats should only contain community A",
    dashboard.communityStats[0]?.id,
    communityA.id,
  );
  const communityBInStats = dashboard.communityStats.find(
    (c) => c.id === communityB.id,
  );
  TestValidator.equals(
    "community stats should not contain community B",
    communityBInStats,
    null,
  );
  // Validation: Verify pending reports only from community A
  TestValidator.equals(
    "pending reports length should only contain reports from community A",
    dashboard.pendingReports.length,
    1,
  );
  TestValidator.equals(
    "pending report should be from community A",
    dashboard.pendingReports[0]?.community_name,
    communityA.name,
  );
  const reportInCommunityBInDashboard = dashboard.pendingReports.find(
    (r) => r.community_name === communityB.name,
  );
  TestValidator.equals(
    "pending reports should not contain report from community B",
    reportInCommunityBInDashboard,
    null,
  );
  // Validation: Verify recent activity only from community A
  const activityFromCommunityB = dashboard.recentActivity.some(
    (a) => a.community.id === communityB.id,
  );
  TestValidator.predicate(
    "recent activity should not contain entries from community B",
    !activityFromCommunityB,
  );
  // Validation: Verify active bans only from community A
  const banFromCommunityB = dashboard.activeBans.some(
    (b) => b.community.id === communityB.id,
  );
  TestValidator.predicate(
    "active bans should not contain bans from community B",
    !banFromCommunityB,
  );
  // Validation: Verify all data in dashboard is scoped to community A
  const allCommunityIds = [
    ...dashboard.communityStats.map((c) => c.id),
    ...dashboard.pendingReports
      .map((r) => r.community_name)
      .map((name) => (communityA.name === name ? communityA.id : "")),
    ...dashboard.recentActivity.map((a) => a.community.id),
    ...dashboard.activeBans.map((b) => b.community.id),
  ];
  allCommunityIds.forEach((id, index) => {
    if (id && id !== "") {
      TestValidator.equals(
        `entry at index ${index} should be from community A`,
        id,
        communityA.id,
      );
    }
  });
}
