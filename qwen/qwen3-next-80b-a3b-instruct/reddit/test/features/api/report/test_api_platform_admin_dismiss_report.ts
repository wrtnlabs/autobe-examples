import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_dismiss_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  // Store email and password before the join operation
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(16);
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: randomEmail,
        password: randomPassword,
      },
    },
  );
  // 2. Login as platform admin using the stored credentials
  await authorize_platform_admin_login(platformAdminConnection, {
    body: {
      email: randomEmail,
      password: randomPassword,
    },
  });
  // 3. Get a pending comment report from any community
  const reportList =
    await api.functional.redditCommunity.communityModerator.reports.index(
      platformAdminConnection,
      {
        body: {
          status: "pending",
          target_type: "comment",
          sortBy: "newest",
          page: 1,
          limit: 1,
        },
      },
    );
  // Validate we found at least one report
  if (reportList.data.length === 0) {
    throw new Error("No pending comment report found, cannot test dismissal");
  }
  const report = reportList.data[0];
  // 4. Dismiss the report using the report's comment_id and report_id
  const dismissed =
    await api.functional.redditCommunity.communityModerator.communities.reports.dismiss(
      platformAdminConnection,
      {
        communityId: report.comment_id,
        reportId: report.id,
      },
    );
  typia.assert(dismissed);
  // 5. Validate the report was dismissed
  TestValidator.equals(
    "report status is dismissed",
    dismissed.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_at is set",
    dismissed.resolved_at !== null && dismissed.resolved_at !== undefined,
  );
}
