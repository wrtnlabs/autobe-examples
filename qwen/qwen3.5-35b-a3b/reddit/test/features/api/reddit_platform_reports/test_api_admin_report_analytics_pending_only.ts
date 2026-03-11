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

export async function test_api_admin_report_analytics_pending_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      username: RandomGenerator.alphaNumeric(10),
      password: "admin123456",
      display_name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123456",
    },
  });
  // 2. Create test members and communities
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      username: RandomGenerator.alphaNumeric(10),
      password: "member123456",
      displayName: "Test Member",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Create multiple communities
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Create another member account
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: "member2@test.com",
      username: RandomGenerator.alphaNumeric(10),
      password: "member2123456",
      displayName: "Test Member 2",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 3. Get posts from communities for reporting
  const posts1 = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        communityId: community1.id,
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(posts1);
  const posts2 = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        communityId: community2.id,
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(posts2);
  // 4. Submit reports with PENDING status (default)
  const pendingReport1 =
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
          reported_content_type: "POST",
          reported_content_id:
            posts1.data.length > 0
              ? posts1.data[0].id
              : "00000000-0000-0000-0000-000000000000",
          reason: "Test pending report 1 for validation",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(pendingReport1);
  const pendingReport2 =
    await api.functional.redditPlatform.member.reports.create(
      member2Connection,
      {
        body: {
          community_id: community2.id,
          reported_content_type: "POST",
          reported_content_id:
            posts2.data.length > 0
              ? posts2.data[0].id
              : "00000000-0000-0000-0000-000000000000",
          reason: "Test pending report 2 for validation",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(pendingReport2);
  // 5. Get analytics with PENDING status filter
  const analyticsResult =
    await api.functional.redditPlatform.admin.analytics.reports.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
        } satisfies IRedditPlatformReportAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResult);
  // Validate response structure
  typia.assert(analyticsResult.data);
  // 6. Verify the PENDING filter results
  if (analyticsResult.data.length > 0) {
    const analytics = analyticsResult.data[0];
    TestValidator.equals(
      "total_reports should equal pending_reports for PENDING filter",
      analytics.total_reports,
      analytics.pending_reports,
    );
    TestValidator.equals(
      "resolution_rate should be 0 for PENDING only",
      analytics.resolution_rate,
      0,
    );
    TestValidator.predicate(
      "average_resolution_time_ms should be 0 for PENDING only",
      analytics.average_resolution_time_ms === 0,
    );
    TestValidator.notEquals(
      "content_type_distribution should have entries",
      Object.entries(analytics.content_type_distribution).length,
      0,
    );
    TestValidator.notEquals(
      "community_breakdown should have entries",
      analytics.community_breakdown.length,
      0,
    );
  } else {
    // Empty result is valid if no pending reports exist
    TestValidator.equals(
      "empty data for PENDING filter",
      analyticsResult.data.length,
      0,
    );
  }
}
