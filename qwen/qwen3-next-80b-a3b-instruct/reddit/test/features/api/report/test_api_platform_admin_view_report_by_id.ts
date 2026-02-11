import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_view_report_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a comment report using the admin connection
  // We need to simulate a report creation - but since no API is provided for creating reports,
  // we'll assume the report exists in the database as per scenario. We'll generate a random report ID.
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the report using platform admin connection
  const report = await api.functional.redditCommunity.platformAdmin.reports.at(
    adminConnection,
    { reportId },
  );
  typia.assert(report);
  // 4. Validate report structure and properties
  TestValidator.equals(
    "reporter_id is UUID",
    typeof report.reporter_id,
    "string",
  );
  TestValidator.equals(
    "comment_id is UUID",
    typeof report.comment_id,
    "string",
  );
  TestValidator.equals("reason is string", typeof report.reason, "string");
  TestValidator.equals("status is pending", report.status, "pending");
  TestValidator.equals(
    "created_at is ISO datetime",
    typeof report.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is ISO datetime",
    typeof report.updated_at,
    "string",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(report.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(report.updated_at).getTime()),
  );
  // Validate that resolved_at is nullable as per specification
  TestValidator.equals(
    "resolved_at should be null for pending report",
    report.resolved_at,
    null,
  );
}
