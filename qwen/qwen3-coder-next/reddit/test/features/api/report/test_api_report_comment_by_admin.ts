import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_comment_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IRedditPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin123456",
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const admin: IRedditPlatformAdmin.IAuthorized =
    await api.functional.redditPlatform.auth.admin.join(adminJoinConnection, {
      body: adminCredentials,
    });
  typia.assert(admin);
  // 2. Create a new connection with the admin token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 3. Create a report for a comment
  // Note: In a real scenario, we would first create a comment through member workflow
  // but for this test we use a valid UUID as the reported_id since we don't have
  // access to comment creation endpoints in the available SDK functions
  const reportBody: IRedditPlatformReport.ICreate = {
    reported_type: "COMMENT",
    reported_id: typia.random<string & tags.Format<"uuid">>(),
    reason:
      "This comment contains inappropriate language and violates community guidelines.",
  };
  const report =
    await api.functional.redditPlatform.admin.redditPlatform.reports.create(
      adminConnection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);
  // 4. Validate the report
  TestValidator.equals(
    "reported_type is COMMENT",
    report.reportedType,
    "COMMENT",
  );
  TestValidator.equals(
    "reported_id matches",
    report.reportedId,
    reportBody.reported_id,
  );
  TestValidator.equals("reason matches", report.reason, reportBody.reason);
  TestValidator.equals("status is PENDING", report.status, "PENDING");
  TestValidator.predicate(
    "has reporter info",
    report.reporter !== null && report.reporter !== undefined,
  );
  TestValidator.equals(
    "reporter username is admin",
    report.reporter.username,
    admin.username,
  );
}
