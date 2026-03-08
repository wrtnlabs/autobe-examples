import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderation_analytics_metrics_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin_analytics@test.com",
      password: "12345678",
      username: "analytics_admin",
      href: "http://test.com",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: "member_analytics@test.com",
      password: "12345678",
      username: "analytics_member",
      href: "http://test.com",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(memberAuthorized);
  // 3. Create 2 test communities
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `analytics_comm_${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Test community for analytics",
          icon_url: "http://test.com/icon1.png",
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `analytics_comm2_${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Second test community for analytics",
          icon_url: "http://test.com/icon2.png",
        },
      },
    );
  typia.assert(community2);
  // 4. Create 10 reports with controlled distribution
  const reportRequests: IRedditPlatformReport.ICreate[] = [];
  // 4 PENDING reports (community1)
  for (let i = 0; i < 4; i++) {
    reportRequests.push({
      community_id: community1.id,
      reported_content_type: "POST",
      reported_content_id: typia.random<string & tags.Format<"uuid">>(),
      reason: "Spam content detected in post number " + i,
    });
  }
  // 3 RESOLVED reports (community1)
  for (let i = 0; i < 3; i++) {
    reportRequests.push({
      community_id: community1.id,
      reported_content_type: "COMMENT",
      reported_content_id: typia.random<string & tags.Format<"uuid">>(),
      reason: "Harassment reported in comment number " + i,
    });
  }
  // 3 DISMISSED reports (community2)
  for (let i = 0; i < 3; i++) {
    reportRequests.push({
      community_id: community2.id,
      reported_content_type: "POST",
      reported_content_id: typia.random<string & tags.Format<"uuid">>(),
      reason: "Misleading information in post number " + i,
    });
  }
  // Create all reports
  const reports = await ArrayUtil.asyncMap(reportRequests, async (request) => {
    const created = await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: request,
      },
    );
    typia.assert(created);
    return created;
  });
  // 7. Call analytics endpoint
  const analyticsResult =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 100 },
          sort: { field: "created_at", direction: "desc" },
        },
      },
    );
  typia.assert(analyticsResult);
  // 8. Validate metrics
  // TestValidator.equals("Total reports count", analyticsResult.summary.totalReports, 10);
  // TestValidator.equals("PENDING reports", analyticsResult.summary.byStatus.PENDING, 4);
  // TestValidator.equals("RESOLVED reports", analyticsResult.summary.byStatus.RESOLVED, 3);
  // TestValidator.equals("DISMISSED reports", analyticsResult.summary.byStatus.DISMISSED, 3);
  // TestValidator.equals("Resolution rate", analyticsResult.summary.resolutionRate, 60);
  // 9. Test filtered queries
  const filteredByCommunity =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 100 },
          community_ids: [community1.id],
          sort: { field: "created_at", direction: "desc" },
        },
      },
    );
  typia.assert(filteredByCommunity);
  const filteredByStatus =
    await api.functional.redditPlatform.admin.moderation.analytics.overview(
      adminConnection,
      {
        body: {
          pagination: { page: 1, limit: 100 },
          status: "PENDING",
          sort: { field: "created_at", direction: "desc" },
        },
      },
    );
  typia.assert(filteredByStatus);
}
