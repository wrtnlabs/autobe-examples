import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_approval_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up platform admin actor
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdminCredentials: IRedditCommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  };
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: platformAdminCredentials,
    });
  // 2. Set up member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  };
  await authorize_member_join(memberConnection, { body: memberCredentials });
  const memberLogin: IRedditCommunityMember.ILogin = {
    email: memberCredentials.email,
    password: memberCredentials.password,
  };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_login(memberConnection, { body: memberLogin });
  // 3. Create a report on a post by the member
  const reportReason = RandomGenerator.paragraph({ sentences: 1 });
  const report: IRedditCommunityReport =
    await generate_random_reddit_community_member_reports_create(
      memberConnection,
      {
        body: {
          reason: reportReason,
          postId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report reason matches", report.reason, reportReason);
  // 4. Platform admin approves the report
  const approvedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.platformAdmin.reports.approve.putByReportid(
      platformAdminConnection,
      { reportId: report.id },
    );
  typia.assert(approvedReport);
  // 5. Validate approval results
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.equals(
    "report resolved by platform admin ID",
    approvedReport.resolved_by_user?.id,
    platformAdmin.id,
  );
  TestValidator.equals(
    "report resolved by platform admin username",
    approvedReport.resolved_by_user?.username,
    platformAdmin.username,
  );
  TestValidator.equals(
    "report reason preserved",
    approvedReport.reason,
    reportReason,
  );
}
