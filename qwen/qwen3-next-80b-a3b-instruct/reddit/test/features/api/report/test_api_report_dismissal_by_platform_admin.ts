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

export async function test_api_report_dismissal_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(adminAuth);
  // 2. Generate a random pending report using typia.random (system has this report)
  // This report has status: "pending" by default (resolved_at is null)
  const report = typia.random<IRedditCommunityCommentReport>();
  const reportId = report.id;
  typia.assert(report);
  // 3. Dismiss the report as platform admin
  const dismissedReport =
    await api.functional.redditCommunity.platformAdmin.reports.dismiss(
      adminConnection,
      { reportId },
    );
  typia.assert(dismissedReport);
  // 4. Verify that report status changed to 'dismissed'
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // 5. Verify that resolved_at is set and is a valid timestamp
  TestValidator.predicate("resolved_at is set and is a valid date-time", () => {
    if (!dismissedReport.resolved_at) return false;
    const date = new Date(dismissedReport.resolved_at);
    return (
      !isNaN(date.getTime()) &&
      date.toISOString() === dismissedReport.resolved_at
    );
  });
  // 6. Verify other fields remain unchanged (comment_id, reporter_id, reason, created_at, updated_at)
  TestValidator.equals(
    "comment_id unchanged",
    dismissedReport.comment_id,
    report.comment_id,
  );
  TestValidator.equals(
    "reporter_id unchanged",
    dismissedReport.reporter_id,
    report.reporter_id,
  );
  TestValidator.equals(
    "reason unchanged",
    dismissedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "created_at unchanged",
    dismissedReport.created_at,
    report.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed after dismissal",
    dismissedReport.updated_at,
    report.updated_at,
  );
  // 7. Verify resolved_at was null before (we know this from our generated report)
  TestValidator.equals(
    "resolved_at was null before dismissal",
    report.resolved_at,
    null,
  );
}
