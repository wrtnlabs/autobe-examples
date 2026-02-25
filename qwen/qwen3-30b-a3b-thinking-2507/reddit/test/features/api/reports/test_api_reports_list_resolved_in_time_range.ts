import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReport";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reports_list_resolved_in_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.name(1),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Query reports within the last 30 days with approved and dismissed status
  const timeRangeStart = new Date(
    Date.now() - 60 * 60 * 24 * 30 * 1000,
  ).toISOString();
  const timeRangeEnd = new Date().toISOString();
  const reports = await api.functional.reddit.member.reports.index(
    memberConnection,
    {
      body: {
        minCreatedAt: timeRangeStart,
        maxCreatedAt: timeRangeEnd,
        status: "approved" as const,
      } satisfies IRedditReport.IRequest,
    },
  );
  typia.assert(reports);
  // 3. Validate response contains only approved and dismissed reports within time range
  const validReports = reports.data.filter((report) => {
    const reportDate = new Date(report.createdAt);
    return (
      reportDate >= new Date(timeRangeStart) &&
      reportDate <= new Date(timeRangeEnd) &&
      ["approved", "dismissed"].includes(report.status)
    );
  });
  // 4. Validate business logic conditions
  TestValidator.equals(
    "expected report count",
    validReports.length,
    reports.data.length,
  );
  reports.data.forEach((report) => {
    TestValidator.predicate(
      `report status is valid: ${report.status}`,
      ["approved", "dismissed"].includes(report.status),
    );
    TestValidator.predicate(
      `report has reporter username: ${report.reporterUsername}`,
      !!report.reporterUsername,
    );
  });
}