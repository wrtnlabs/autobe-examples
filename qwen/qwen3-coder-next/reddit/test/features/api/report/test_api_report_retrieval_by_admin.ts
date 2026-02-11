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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Create a post using member connection (placeholder since post creation not available)
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  // Member creates a report for the post
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: mockPostId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Admin retrieves the report
  const retrievedReport =
    await api.functional.redditPlatform.admin.redditPlatform.reports.at(
      adminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Validate report contains expected fields
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporterId,
    report.reporterId,
  );
  TestValidator.equals(
    "reported type matches",
    retrievedReport.reportedType,
    report.reportedType,
  );
  TestValidator.equals(
    "reported ID matches",
    retrievedReport.reportedId,
    report.reportedId,
  );
  TestValidator.equals("reason matches", retrievedReport.reason, report.reason);
  TestValidator.equals("status is pending", retrievedReport.status, "PENDING");
  TestValidator.predicate(
    "has reporter info",
    retrievedReport.reporter !== null,
  );
}
