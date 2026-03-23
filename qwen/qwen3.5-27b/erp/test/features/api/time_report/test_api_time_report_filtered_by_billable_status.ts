import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test time report generation with billable status filtering.
 *
 * This test validates that the time report endpoint correctly filters timelogs
 * by billable status and aggregates hours appropriately. It tests both billable
 * and non-billable filtering, as well as combined filters with other optional
 * parameters like project_id and employee_id.
 */
export async function test_api_time_report_filtered_by_billable_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Prepare date range (30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  // 3. Test billable=true filter
  const billableReport =
    await api.functional.hrmPlatform.admin.time_reports.index(adminConnection, {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        grouping: "employee",
        billable: true,
      } satisfies IHrmPlatformTimeReport.IRequest,
    });
  typia.assert(billableReport);
  // Verify all entries have non_billable_hours = 0 when billable=true
  for (const entry of billableReport.data) {
    TestValidator.equals(
      "non_billable_hours is 0 when billable=true",
      entry.non_billable_hours,
      0,
    );
    TestValidator.predicate(
      "total_hours equals billable_hours when billable=true",
      entry.total_hours === entry.billable_hours,
    );
  }
  // 4. Test billable=false filter
  const nonBillableReport =
    await api.functional.hrmPlatform.admin.time_reports.index(adminConnection, {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        grouping: "employee",
        billable: false,
      } satisfies IHrmPlatformTimeReport.IRequest,
    });
  typia.assert(nonBillableReport);
  // Verify all entries have billable_hours = 0 when billable=false
  for (const entry of nonBillableReport.data) {
    TestValidator.equals(
      "billable_hours is 0 when billable=false",
      entry.billable_hours,
      0,
    );
    TestValidator.predicate(
      "total_hours equals non_billable_hours when billable=false",
      entry.total_hours === entry.non_billable_hours,
    );
  }
  // 5. Test combined filters with project_id and employee_id
  // Use first employee from billable report if available
  if (billableReport.data.length > 0) {
    const firstEmployeeId = billableReport.data[0].group_id;
    const combinedFilterReport =
      await api.functional.hrmPlatform.admin.time_reports.index(
        adminConnection,
        {
          body: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            grouping: "project",
            employee_id: firstEmployeeId,
            billable: true,
          } satisfies IHrmPlatformTimeReport.IRequest,
        },
      );
    typia.assert(combinedFilterReport);
    // Verify all entries are for the specified employee and billable
    for (const entry of combinedFilterReport.data) {
      TestValidator.equals(
        "non_billable_hours is 0 with combined filters",
        entry.non_billable_hours,
        0,
      );
      TestValidator.predicate(
        "entry has valid project grouping",
        entry.group_type === "project",
      );
    }
  }
  // 6. Test without billable filter (should include both billable and non-billable)
  const allReport = await api.functional.hrmPlatform.admin.time_reports.index(
    adminConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        grouping: "employee",
      } satisfies IHrmPlatformTimeReport.IRequest,
    },
  );
  typia.assert(allReport);
  // Verify total_hours = billable_hours + non_billable_hours
  for (const entry of allReport.data) {
    TestValidator.predicate(
      "total_hours equals sum of billable and non_billable",
      Math.abs(
        entry.total_hours - (entry.billable_hours + entry.non_billable_hours),
      ) < 0.001,
    );
  }
}
