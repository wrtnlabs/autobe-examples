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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for reporting
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create another member as reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporter);
  // 3. Reporter creates a report (post)
  const postReport =
    await api.functional.redditPlatform.member.redditPlatform.reports.at(
      reporterConnection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(postReport);
  // 4. Validate report structure
  TestValidator.equals("report has valid ID", typeof postReport.id, "string");
  TestValidator.equals(
    "report has valid reporterId",
    typeof postReport.reporterId,
    "string",
  );
  TestValidator.equals(
    "report has valid reportedType",
    postReport.reportedType,
    "POST",
  );
  TestValidator.equals("report has valid status", postReport.status, "PENDING");
  TestValidator.equals(
    "report has valid createdAt",
    typeof postReport.createdAt,
    "string",
  );
  TestValidator.equals(
    "report has valid updatedAt",
    typeof postReport.updatedAt,
    "string",
  );
  TestValidator.equals(
    "report has valid reporter info",
    typeof postReport.reporter.id,
    "string",
  );
  TestValidator.equals(
    "report has valid reporter username",
    typeof postReport.reporter.username,
    "string",
  );
  TestValidator.equals(
    "report resolvedBy is null when pending",
    postReport.resolvedById,
    null,
  );
}
