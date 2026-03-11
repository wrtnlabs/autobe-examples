import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModeratorDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorDashboardSummary";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import type { IRedditPlatformPendingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPendingReport";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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

export async function test_api_admin_dashboard_mixed_report_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(admin);
  // 2. Create member accounts for report submitters
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 3. Create a community (member1 will own it)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create a comment (member2) - post is created via SDK
  const post = await api.functional.redditPlatform.posts.index(
    member2Connection,
    {
      body: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post (member2)
  const comment = await api.functional.redditPlatform.member.comments.create(
    member2Connection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 6. Submit report for post (member1)
  const postReport = await api.functional.redditPlatform.member.reports.create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: post.data[0]?.id ?? "",
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(postReport);
  // 7. Submit report for comment (member2)
  const commentReport =
    await api.functional.redditPlatform.member.reports.create(
      member2Connection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "COMMENT",
          reported_content_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(commentReport);
  // 8. Query admin dashboard
  const dashboard =
    await api.functional.redditPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // 9. Validate mixed report types exist
  TestValidator.equals(
    "dashboard has pending reports",
    dashboard.reports.length >= 2,
    true,
  );
  TestValidator.equals(
    "dashboard has summary pending count",
    dashboard.summary.pending_count >= 2,
    true,
  );
  const postReportEntry = dashboard.reports.find(
    (r) => r.reported_content_type === "POST",
  );
  const commentReportEntry = dashboard.reports.find(
    (r) => r.reported_content_type === "COMMENT",
  );
  // 10. Validate POST report
  TestValidator.equals(
    "post report type",
    postReportEntry?.reported_content_type,
    "POST",
  );
  TestValidator.equals(
    "post report has title",
    postReportEntry?.content_title !== null,
    true,
  );
  TestValidator.equals(
    "post report no preview",
    postReportEntry?.content_preview,
    null,
  );
  TestValidator.equals(
    "post report has reporter",
    postReportEntry?.reporter_username,
    member1.username,
  );
  TestValidator.equals(
    "post report community",
    postReportEntry?.community_name,
    community.name,
  );
  TestValidator.equals(
    "post report has time elapsed",
    postReportEntry?.time_elapsed !== "",
    true,
  );
  // 11. Validate COMMENT report
  TestValidator.equals(
    "comment report type",
    commentReportEntry?.reported_content_type,
    "COMMENT",
  );
  TestValidator.equals(
    "comment report no title",
    commentReportEntry?.content_title,
    null,
  );
  TestValidator.equals(
    "comment report has preview",
    commentReportEntry?.content_preview !== null,
    true,
  );
  TestValidator.equals(
    "comment preview length",
    commentReportEntry?.content_preview?.length ?? 0 <= 200,
    true,
  );
  TestValidator.equals(
    "comment report has reporter",
    commentReportEntry?.reporter_username,
    member2.username,
  );
  TestValidator.equals(
    "comment report community",
    commentReportEntry?.community_name,
    community.name,
  );
  TestValidator.equals(
    "comment report has time elapsed",
    commentReportEntry?.time_elapsed !== "",
    true,
  );
}