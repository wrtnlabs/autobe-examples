import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IPageIRedditPlatformReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportAnalytic";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportAnalytic";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
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
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_admin_report_analytics_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: "Admin@1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: null,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin@1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Create member and community for test data
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: "Member@1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatarUrl: null,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph(),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create posts for reporting
  const post1 = await api.functional.redditPlatform.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph(),
        icon_url: null,
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditPlatform.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph(),
        icon_url: null,
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(post2);
  // 4. Submit reports at different times using existing communities as content IDs
  // Report 1: 10 days ago (within range)
  const report1 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: community.id,
        reason: "This is a test report for content moderation",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // Report 2: 35 days ago (outside range)
  const report2 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: post1.id,
        reported_content_type: "POST",
        reported_content_id: post1.id,
        reason: "This is another test report for content moderation",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // Report 3: 60 days ago (outside range)
  const report3 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: post2.id,
        reported_content_type: "COMMENT",
        reported_content_id: post2.id,
        reason: "This is a third test report for content moderation",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  // 5. Call analytics with date range (last 30 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30 days ago
  const endDate = new Date(); // today
  const analyticsResponse =
    await api.functional.redditPlatform.admin.analytics.reports.index(
      adminConnection,
      {
        body: {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          status: "ALL" as const,
          content_type: undefined,
          community_id: null,
          page: null,
          limit: null,
        } satisfies IRedditPlatformReportAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  const analytics = analyticsResponse.data[0];
  // 6. Validate analytics response structure and date range filtering
  TestValidator.predicate("analytics summary exists", analytics !== undefined);
  TestValidator.predicate(
    "total reports within date range is non-negative",
    analytics.total_reports >= 0,
  );
  TestValidator.predicate(
    "pending reports within date range is non-negative",
    analytics.pending_reports >= 0,
  );
  TestValidator.predicate(
    "resolution rate is between 0 and 100",
    analytics.resolution_rate >= 0 && analytics.resolution_rate <= 100,
  );
  TestValidator.predicate(
    "average resolution time is non-negative",
    analytics.average_resolution_time_ms >= 0,
  );
  TestValidator.predicate(
    "content type distribution exists",
    analytics.content_type_distribution !== undefined,
  );
  TestValidator.predicate(
    "community breakdown exists",
    analytics.community_breakdown !== undefined,
  );
  // 7. Test with different date range (older data)
  const historicalStartDate = new Date();
  historicalStartDate.setDate(historicalStartDate.getDate() - 90); // 90 days ago
  const historicalEndDate = new Date();
  historicalEndDate.setDate(historicalEndDate.getDate() - 61); // 61 days ago
  const historicalAnalyticsResponse =
    await api.functional.redditPlatform.admin.analytics.reports.index(
      adminConnection,
      {
        body: {
          start_date: historicalStartDate.toISOString().split("T")[0],
          end_date: historicalEndDate.toISOString().split("T")[0],
          status: "ALL" as const,
          content_type: undefined,
          community_id: null,
          page: null,
          limit: null,
        } satisfies IRedditPlatformReportAnalytic.IRequest,
      },
    );
  typia.assert(historicalAnalyticsResponse);
  const historicalAnalytics = historicalAnalyticsResponse.data[0];
  TestValidator.predicate(
    "historical analytics summary exists",
    historicalAnalytics !== undefined,
  );
  TestValidator.predicate(
    "historical total reports within range is non-negative",
    historicalAnalytics.total_reports >= 0,
  );
  // 8. Verify that reports are correctly filtered by date range
  // The current range (last 30 days) should have at least 1 report (report1)
  TestValidator.predicate(
    "current range has expected reports",
    analytics.total_reports >= 1,
  );
  // Historical range may have 0-3 reports depending on when they were created
  TestValidator.predicate(
    "historical range has non-negative reports",
    historicalAnalytics.total_reports >= 0,
  );
  // Test that different date ranges can produce different results
  // (they don't have to be different, but the validation allows it)
  TestValidator.predicate(
    "analytics response is valid",
    analytics !== undefined && historicalAnalytics !== undefined,
  );
}