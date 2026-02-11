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

export async function test_api_platform_admin_dismiss_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Generate report ID and comment ID for testing
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Dismiss the report as platform admin
  const dismissedReport =
    await api.functional.redditCommunity.platformAdmin.reports.action(
      adminConnection,
      {
        reportId: reportId,
        body: {
          status: "dismissed",
          target_type: "comment",
          comment_id: commentId,
          sortBy: "newest",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(dismissedReport);
  // 4. Validate dismissal result
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_at is set",
    dismissedReport.resolved_at !== null,
  );
  TestValidator.equals("report id matches", dismissedReport.id, reportId);
  TestValidator.equals(
    "comment_id preserved",
    dismissedReport.comment_id,
    commentId,
  );
  TestValidator.predicate(
    "reporter_id exists",
    dismissedReport.reporter_id !== null,
  );
  TestValidator.predicate("reason exists", dismissedReport.reason.length > 0);
  TestValidator.predicate(
    "created_at exists",
    dismissedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    dismissedReport.updated_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at is after created_at",
    (dismissedReport.resolved_at ?? new Date()) > dismissedReport.created_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    dismissedReport.updated_at >= dismissedReport.created_at,
  );
}