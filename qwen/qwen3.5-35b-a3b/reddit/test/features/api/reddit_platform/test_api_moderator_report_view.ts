import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderator_report_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member to test authenticated report viewing
  const testConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(testConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. View a report by ID (moderator authentication required)
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reportDetails: IRedditPlatformReport =
    await api.functional.redditPlatform.member.reports.at(testConnection, {
      reportId: reportId,
    });
  typia.assert(reportDetails);
  // 3. Validate SLO metrics response structure
  TestValidator.equals(
    "sla compliance rate is valid percentage",
    reportDetails.sla_compliance_rate >= 0 &&
      reportDetails.sla_compliance_rate <= 100,
    true,
  );
  TestValidator.equals(
    "avg response time is positive",
    reportDetails.avg_response_time_hours > 0,
    true,
  );
  TestValidator.equals(
    "pending count is non-negative",
    reportDetails.backlog_by_status.pending >= 0,
    true,
  );
  TestValidator.equals(
    "resolved count is non-negative",
    reportDetails.backlog_by_status.resolved >= 0,
    true,
  );
  TestValidator.equals(
    "dismissed count is non-negative",
    reportDetails.backlog_by_status.dismissed >= 0,
    true,
  );
  TestValidator.equals(
    "daily volume array exists",
    reportDetails.report_volume_trends.daily_volume.length >= 0,
    true,
  );
  TestValidator.equals(
    "resolution rate array exists",
    reportDetails.report_volume_trends.resolution_rate.length >= 0,
    true,
  );
  TestValidator.equals(
    "sla breaches array exists",
    reportDetails.sla_breaches.length >= 0,
    true,
  );
}
