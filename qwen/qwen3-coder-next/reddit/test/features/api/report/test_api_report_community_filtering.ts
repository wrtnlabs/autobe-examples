import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_community_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for report filtering
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create a test member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Prepare request with communityId filtering
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    communityId: communityId,
    page: 1,
    pageSize: 20,
  } satisfies IRedditPlatformReport.IRequest;
  // 3. Call the report filtering endpoint
  const result =
    await api.functional.redditPlatform.member.redditPlatform.reports.index(
      memberConnection,
      {
        body: request,
      },
    );
  // 4. Validate response structure
  typia.assert(result);
  // 5. Verify pagination structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  // 6. Each report should contain proper structure
  for (const report of result.data) {
    typia.assert(report);
    // Verify required fields exist
    TestValidator.equals("report has id", typeof report.id, "string");
    TestValidator.equals(
      "report has reporterId",
      typeof report.reporterId,
      "string",
    );
    TestValidator.equals(
      "report has reportedType",
      ["POST", "COMMENT"].includes(report.reportedType),
      true,
    );
    TestValidator.equals(
      "report has status",
      ["PENDING", "APPROVED", "DISMISSED"].includes(report.status),
      true,
    );
    // Verify reporter information
    TestValidator.equals(
      "reporter has id",
      typeof report.reporter.id,
      "string",
    );
    TestValidator.equals(
      "reporter has username",
      typeof report.reporter.username,
      "string",
    );
  }
}
