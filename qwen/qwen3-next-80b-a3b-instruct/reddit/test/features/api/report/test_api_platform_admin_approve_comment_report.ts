import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_approve_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin account
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  // Validate connection structure to ensure headers is defined
  typia.assert<api.IConnection>(platformAdminConnection);
  // Generate a valid UUID for reportId
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Approve the report as platform admin - provide all required IRequest properties
  const approvalResponse =
    await api.functional.redditCommunity.platformAdmin.reports.action(
      platformAdminConnection,
      {
        reportId,
        body: {
          status: "approved",
          target_type: "comment", // Required by IRequest
          sortBy: "newest", // Required by IRequest
          page: 1, // Required by IRequest
          limit: 10, // Required by IRequest
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(approvalResponse);
  // Verify response matches the expected report structure
  TestValidator.equals(
    "report status should be approved",
    approvalResponse.status,
    "approved",
  );
  TestValidator.equals(
    "report should have the same id",
    approvalResponse.id,
    reportId,
  );
  TestValidator.predicate(
    "report should have updated_at timestamp",
    () =>
      !!approvalResponse.updated_at &&
      typeof approvalResponse.updated_at === "string",
  );
  TestValidator.predicate(
    "report should have resolved_at timestamp",
    () =>
      !!approvalResponse.resolved_at &&
      typeof approvalResponse.resolved_at === "string",
  );
}
