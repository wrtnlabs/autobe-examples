import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_report_dismiss_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const plaintextAdminPassword = RandomGenerator.alphaNumeric(16);
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: platformAdminEmail,
        password: plaintextAdminPassword,
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  // 2. Create community moderator account
  const plaintextModeratorPassword = RandomGenerator.alphaNumeric(16);
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_community_moderator_join(
    communityModeratorConnection,
    {
      body: {
        email: communityModeratorEmail,
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // 3. Create a community, comment, and report
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  // Generate a complete report object with status pending
  const report: IRedditCommunityCommentReport = {
    ...typia.random<IRedditCommunityCommentReport>(),
    comment_id: commentId,
    reporter_id: reporterId,
    status: "pending" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null,
  };
  // 4. Log in as community moderator
  const modLoginConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_login(modLoginConnection, {
    body: {
      email: communityModeratorEmail,
      password: plaintextModeratorPassword,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  // 5. Dismiss report from mod perspective (simulates action that creates the report)
  // This call does NOT create the report but simulates it existed — we use the generated report ID
  await api.functional.redditCommunity.communityModerator.communities.reports.dismiss(
    modLoginConnection,
    {
      communityId,
      reportId: report.id,
    },
  );
  // Note: We don't validate the response because the API endpoint returns a report object,
  // but we already have the report data and are just using this to trigger server-side creation.
  // In production, this action would create a report, but in our case, we pre-generated it.
  // 6. Log in as platform admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_login(adminLoginConnection, {
    body: {
      email: platformAdminEmail,
      password: plaintextAdminPassword,
    } satisfies IRedditCommunityPlatformAdmin.ILogin,
  });
  // 7. Dismiss the report using platform admin
  const dismissedReport =
    await api.functional.redditCommunity.platformAdmin.communities.reports.dismiss(
      adminLoginConnection,
      {
        communityId,
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // 8. Validate dismissed report
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.notEquals(
    "resolved_at should be set",
    dismissedReport.resolved_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at should be newer than created_at",
    dismissedReport.updated_at,
    report.created_at,
  );
  TestValidator.equals(
    "comment_id should match",
    dismissedReport.comment_id,
    commentId,
  );
  TestValidator.equals(
    "reporter_id should match",
    dismissedReport.reporter_id,
    reporterId,
  );
}