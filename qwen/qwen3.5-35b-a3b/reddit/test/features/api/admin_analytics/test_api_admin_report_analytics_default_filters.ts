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
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
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

export async function test_api_admin_report_analytics_default_filters(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(16),
      href: "",
      referrer: "",
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: "password123",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: "",
      referrer: "",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies IRedditPlatformMember.ILogin,
  });
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
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
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const report1 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
        reported_content_type: "POST",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "This is a test report for invalid content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
        reported_content_type: "COMMENT",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "Another test report for spam content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  const report3 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community2.id,
        reported_content_type: "POST",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "Third report for hate speech",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  const report4 = await api.functional.redditPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        community_id: community2.id,
        reported_content_type: "COMMENT",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "Fourth report for harassment",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report4);
  await api.functional.redditPlatform.member.communities.moderators.addModerator(
    memberConnection,
    {
      communityId: community1.id,
      userId: adminAuth.id,
    },
  );
  await api.functional.redditPlatform.member.communities.moderators.addModerator(
    memberConnection,
    {
      communityId: community2.id,
      userId: adminAuth.id,
    },
  );
  const analytics =
    await api.functional.redditPlatform.admin.analytics.reports.index(
      adminConnection,
      {
        body: {} satisfies IRedditPlatformReportAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  const data = analytics.data[0];
  typia.assert(data);
  TestValidator.equals("total_reports", data.total_reports, 4);
  TestValidator.equals("pending_reports", data.pending_reports, 4);
  TestValidator.equals("resolution_rate", data.resolution_rate, 0);
  TestValidator.equals(
    "average_resolution_time_ms",
    data.average_resolution_time_ms,
    0,
  );
  const contentDist =
    data.content_type_distribution as unknown as IRedditPlatformReportAnalytic.IContentTypeDistribution[];
  TestValidator.equals(
    "content type distribution count",
    contentDist.length,
    2,
  );
  const postDistribution = contentDist.find(
    (d: IRedditPlatformReportAnalytic.IContentTypeDistribution) =>
      d.contentType === "POST",
  );
  const commentDistribution = contentDist.find(
    (d: IRedditPlatformReportAnalytic.IContentTypeDistribution) =>
      d.contentType === "COMMENT",
  );
  TestValidator.equals("post count", postDistribution?.count, 2);
  TestValidator.equals("comment count", commentDistribution?.count, 2);
  TestValidator.predicate(
    "post percentage",
    postDistribution?.percentage === 50,
  );
  TestValidator.predicate(
    "comment percentage",
    commentDistribution?.percentage === 50,
  );
  TestValidator.predicate(
    "community_breakdown has 2 communities",
    data.community_breakdown.length === 2,
  );
  const community1Breakdown = data.community_breakdown.find(
    (c) => c.communityId === community1.id,
  );
  const community2Breakdown = data.community_breakdown.find(
    (c) => c.communityId === community2.id,
  );
  TestValidator.equals(
    "community1 total reports",
    community1Breakdown?.reportCount,
    2,
  );
  TestValidator.equals(
    "community1 pending",
    community1Breakdown?.pendingCount,
    2,
  );
  TestValidator.equals(
    "community2 total reports",
    community2Breakdown?.reportCount,
    2,
  );
  TestValidator.equals(
    "community2 pending",
    community2Breakdown?.pendingCount,
    2,
  );
  TestValidator.equals(
    "flagged_communities empty",
    data.flagged_communities.length,
    0,
  );
}
