import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
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
import type { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
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

export async function test_api_report_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: "https://example.com/admin-join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2. Create member account and login
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinResult = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com/member-join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoinResult);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // 3. Create community
  const communityCreateConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityCreateConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Add admin as moderator to the community
  const adminAsMemberConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.member.communities.moderators.addModerator(
    adminAsMemberConnection,
    {
      communityId: community.id,
      userId: memberJoinResult.id,
    },
  );
  // 5. Create a report
  const reportCreateConnection: api.IConnection = { host: connection.host };
  const reportRaw = await api.functional.redditPlatform.member.reports.create(
    reportCreateConnection,
    {
      body: {
        community_id: community.id,
        reported_content_type: "POST",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(reportRaw);
  // Cast to ISummary to access report properties
  const report: IRedditPlatformReport.ISummary =
    reportRaw as unknown as IRedditPlatformReport.ISummary;
  // 6. Retrieve report view
  const reportViewConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(reportViewConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const viewId = typia.random<string & tags.Format<"uuid">>();
  const reportView = await api.functional.redditPlatform.admin.reports.views.at(
    reportViewConnection,
    {
      reportId: report.id,
      viewId: viewId,
    },
  );
  typia.assert(reportView);
  // 7. Validate response
  TestValidator.equals(
    "moderator matches admin",
    reportView.moderator.id,
    adminJoinResult.id,
  );
  TestValidator.equals(
    "report matches reported",
    reportView.report.id,
    report.id,
  );
  TestValidator.predicate(
    "has valid viewed_at timestamp",
    reportView.viewed_at !== undefined &&
      reportView.viewed_at !== null &&
      !isNaN(new Date(reportView.viewed_at).getTime()),
  );
  TestValidator.equals(
    "report status is PENDING",
    reportView.report.status,
    "PENDING",
  );
  TestValidator.equals(
    "report community matches",
    reportView.report.community.id,
    community.id,
  );
}
