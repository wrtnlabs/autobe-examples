import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_employee_grouping_with_billable_breakdown(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Prepare time report request with employee grouping
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const reportRequest = {
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
    groupBy: "employee" as const,
    page: 1,
    limit: 20,
  } satisfies IHrmPlatformTimeReport.IRequest;
  // 3. Call the time report endpoint
  const reportResponse =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: reportRequest,
      },
    );
  typia.assert(reportResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reportResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reportResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    reportResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    reportResponse.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(reportResponse.data),
  );
  // 6. Validate each report entry
  for (const entry of reportResponse.data) {
    typia.assert(entry);
    // Validate employee information exists (since grouped by employee)
    TestValidator.predicate(
      "employee information present",
      entry.employee !== undefined,
    );
    // Validate hour calculations
    TestValidator.predicate("total hours non-negative", entry.total_hours >= 0);
    TestValidator.predicate(
      "billable hours non-negative",
      entry.billable_hours >= 0,
    );
    TestValidator.predicate(
      "non-billable hours non-negative",
      entry.non_billable_hours >= 0,
    );
    // Validate business logic: total = billable + non-billable
    TestValidator.equals(
      "total hours equals sum of billable and non-billable",
      entry.total_hours,
      entry.billable_hours + entry.non_billable_hours,
    );
    // Validate date range
    TestValidator.predicate(
      "date range start exists",
      entry.date_range.start !== undefined,
    );
    TestValidator.predicate(
      "date range end exists",
      entry.date_range.end !== undefined,
    );
  }
}
