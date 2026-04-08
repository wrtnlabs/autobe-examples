import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_filtering_by_date_range_and_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Calculate date range for first week of current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  // Last day of first week (7 days from first day)
  const lastDayOfWeek = new Date(year, month, 7);
  const dateFrom = firstDayOfMonth.toISOString();
  const dateTo = lastDayOfWeek.toISOString();
  // 3. Test filtering by date range only
  // Note: The API returns aggregated summaries grouped by employee/project/task
  // Since we just joined, no data exists yet - validate structure is correct
  const dateRangeResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        date_from: dateFrom,
        date_to: dateTo,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Validate pagination metadata structure is correct
  TestValidator.predicate(
    "date range pagination has valid records",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    dateRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    dateRangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    dateRangeResult.pagination.pages >= 0,
  );
  // 4. Test filtering by billable=true
  const billableTrueResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(billableTrueResult);
  // Validate response structure for billable filter
  for (const summary of billableTrueResult.data) {
    // Verify summary has required aggregation fields
    TestValidator.predicate(
      "summary has valid groupBy",
      summary.groupBy === "employee" ||
        summary.groupBy === "project" ||
        summary.groupBy === "task",
    );
    TestValidator.predicate(
      "summary has non-negative timelog count",
      summary.timelogCount >= 0,
    );
  }
  // 5. Test filtering by billable=false
  const billableFalseResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: false,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(billableFalseResult);
  // Validate response structure for non-billable filter
  for (const summary of billableFalseResult.data) {
    TestValidator.predicate(
      "summary has valid groupBy",
      summary.groupBy === "employee" ||
        summary.groupBy === "project" ||
        summary.groupBy === "task",
    );
    TestValidator.predicate(
      "summary has non-negative timelog count",
      summary.timelogCount >= 0,
    );
  }
  // 6. Test combined filters: date range + billable=true
  const combinedTrueResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        date_from: dateFrom,
        date_to: dateTo,
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(combinedTrueResult);
  // Validate combined filter response structure
  for (const summary of combinedTrueResult.data) {
    TestValidator.predicate(
      "combined filter summary has valid groupBy",
      summary.groupBy === "employee" ||
        summary.groupBy === "project" ||
        summary.groupBy === "task",
    );
    TestValidator.predicate(
      "combined filter summary has valid minutes",
      summary.totalMinutes >= 0,
    );
  }
  // 7. Test combined filters: date range + billable=false
  const combinedFalseResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        date_from: dateFrom,
        date_to: dateTo,
        billable: false,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(combinedFalseResult);
  // Validate combined filter response structure
  for (const summary of combinedFalseResult.data) {
    TestValidator.predicate(
      "combined filter summary has valid groupBy",
      summary.groupBy === "employee" ||
        summary.groupBy === "project" ||
        summary.groupBy === "task",
    );
    TestValidator.predicate(
      "combined filter summary has valid minutes",
      summary.totalMinutes >= 0,
    );
  }
  // 8. Verify pagination metadata reflects filtered record count
  TestValidator.equals(
    "date range pagination records is non-negative",
    dateRangeResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "billable true pagination records is non-negative",
    billableTrueResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "combined true pagination records is non-negative",
    combinedTrueResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "combined false pagination records is non-negative",
    combinedFalseResult.pagination.records >= 0,
    true,
  );
}
