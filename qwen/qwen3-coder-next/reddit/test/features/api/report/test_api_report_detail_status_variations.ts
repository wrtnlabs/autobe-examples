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

export async function test_api_report_detail_status_variations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and get authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new connection with the member's token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 3. Create a report using the member's authenticated connection
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.at(
      authenticatedConnection,
      { reportId: "00000000-0000-0000-0000-000000000000" },
    );
  typia.assert(report);
  // 4. Validate report structure and status-specific fields
  TestValidator.predicate("report has id", typeof report.id === "string");
  TestValidator.predicate(
    "report has reporterId",
    typeof report.reporterId === "string",
  );
  TestValidator.predicate(
    "report has reportedType",
    report.reportedType === "POST" || report.reportedType === "COMMENT",
  );
  TestValidator.predicate(
    "report has status",
    ["PENDING", "APPROVED", "DISMISSED"].includes(report.status),
  );
  // 5. Validate status-specific field presence
  if (report.status === "PENDING") {
    TestValidator.equals(
      "pending report resolvedById is null",
      report.resolvedById,
      null,
    );
    TestValidator.equals(
      "pending report resolvedAt is null",
      report.resolvedAt,
      null,
    );
    TestValidator.equals(
      "pending report resolvedBy is null or undefined",
      report.resolvedBy,
      null,
    );
  } else {
    TestValidator.predicate(
      "resolved report has resolvedById",
      typeof report.resolvedById === "string",
    );
    TestValidator.predicate(
      "resolved report has resolvedAt",
      typeof report.resolvedAt === "string",
    );
    TestValidator.predicate(
      "resolved report has resolvedBy",
      report.resolvedBy !== null && report.resolvedBy !== undefined,
    );
    if (report.resolvedBy !== null && report.resolvedBy !== undefined) {
      TestValidator.predicate(
        "resolvedBy has id",
        typeof report.resolvedBy.id === "string",
      );
      TestValidator.predicate(
        "resolvedBy has username",
        typeof report.resolvedBy.username === "string",
      );
    }
  }
  // 6. Validate reporter information is present
  TestValidator.predicate(
    "report has reporter",
    report.reporter !== null && report.reporter !== undefined,
  );
  if (report.reporter !== null && report.reporter !== undefined) {
    TestValidator.predicate(
      "reporter has id",
      typeof report.reporter.id === "string",
    );
    TestValidator.predicate(
      "reporter has username",
      typeof report.reporter.username === "string",
    );
  }
}