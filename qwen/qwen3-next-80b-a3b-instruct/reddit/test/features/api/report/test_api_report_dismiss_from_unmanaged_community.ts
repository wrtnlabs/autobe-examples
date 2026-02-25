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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismiss_from_unmanaged_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin: api.functional.redditCommunity.auth.platformAdmin.join.Response =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  // 2. Login as platform admin
  const platformAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_platform_admin_login(platformAdminLoginConnection, {
    body: {
      email: platformAdmin.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.ILogin,
  });
  // 3. Generate a random report ID (near-infinite possibilities, so one is likely to exist)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Dismiss the report using platform admin's global authority
  const dismissedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.platformAdmin.reports.dismiss.putByReportid(
      platformAdminLoginConnection,
      {
        reportId,
      },
    );
  typia.assert(dismissedReport);
  // 5. Validate that the report was dismissed and resolver is set
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.notEquals(
    "reporter and resolver are different",
    dismissedReport.reporter.id,
    dismissedReport.resolved_by_user?.id,
  );
  TestValidator.equals(
    "resolved_by_user is platform admin",
    dismissedReport.resolved_by_user?.id,
    platformAdmin.id,
  );
}
