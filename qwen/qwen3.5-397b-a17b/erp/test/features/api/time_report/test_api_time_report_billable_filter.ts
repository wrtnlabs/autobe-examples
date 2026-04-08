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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test time tracking report generation with billable status filter to separate client work from internal work.
 *
 * Validates the complete time report filtering workflow including member authentication, organization setup, project creation, and timelog generation with mixed billable statuses. Ensures that the billable filter correctly separates billable and non-billable time entries in aggregated reports.
 *
 * Special attention is given to verifying that total_minutes, billable_minutes, and non_billable_minutes are correctly calculated for each filter scenario, and that combining filtered results equals the unfiltered aggregation.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Organization is created for multi-tenancy context.
 * 3. Project is created within the organization.
 * 4. Multiple timelogs are created with varying billable flags (3 billable, 2 non-billable).
 * 5. Report is requested with billable: true filter - validates only billable time is included.
 * 6. Report is requested with billable: false filter - validates only non-billable time is included.
 * 7. Report is requested without billable filter - validates both types are included.
 * 8. Validates that filtered results sum to unfiltered results.
 * 9. Tests filter with different groupBy options (employee, project, task).
 */
export async function test_api_time_report_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create timelogs with mixed billable status
  // Billable timelogs (3 entries)
  const billableDuration1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >();
  const billableDuration2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >();
  const billableDuration3 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >();
  const totalBillableMinutes =
    billableDuration1 + billableDuration2 + billableDuration3;
  const billableTimelog1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: billableDuration1,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(billableTimelog1);
  const billableTimelog2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: billableDuration2,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(billableTimelog2);
  const billableTimelog3 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: billableDuration3,
          hrm_platform_project_id: project.id,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(billableTimelog3);
  // Non-billable timelogs (2 entries)
  const nonBillableDuration1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >();
  const nonBillableDuration2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >();
  const totalNonBillableMinutes = nonBillableDuration1 + nonBillableDuration2;
  const nonBillableTimelog1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: nonBillableDuration1,
          hrm_platform_project_id: project.id,
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(nonBillableTimelog1);
  const nonBillableTimelog2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: nonBillableDuration2,
          hrm_platform_project_id: project.id,
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(nonBillableTimelog2);
  const expectedTotalMinutes = totalBillableMinutes + totalNonBillableMinutes;
  // 5. Request report with billable: true filter
  const billableTrueReport =
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          dateFrom: new Date().toISOString().split("T")[0],
          dateTo: new Date().toISOString().split("T")[0],
          billable: true,
          groupBy: "project",
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(billableTrueReport);
  // 6. Request report with billable: false filter
  const billableFalseReport =
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          dateFrom: new Date().toISOString().split("T")[0],
          dateTo: new Date().toISOString().split("T")[0],
          billable: false,
          groupBy: "project",
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(billableFalseReport);
  // 7. Request report without billable filter (include both)
  const unfilteredReport =
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          dateFrom: new Date().toISOString().split("T")[0],
          dateTo: new Date().toISOString().split("T")[0],
          groupBy: "project",
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(unfilteredReport);
  // 8. Validate billable: true filter results
  TestValidator.equals(
    "billable:true total_minutes matches billable timelogs sum",
    billableTrueReport.total_minutes,
    totalBillableMinutes,
  );
  TestValidator.equals(
    "billable:true billable_minutes equals total_minutes",
    billableTrueReport.billable_minutes,
    billableTrueReport.total_minutes,
  );
  TestValidator.equals(
    "billable:true non_billable_minutes is zero",
    billableTrueReport.non_billable_minutes,
    0,
  );
  // 9. Validate billable: false filter results
  TestValidator.equals(
    "billable:false total_minutes matches non-billable timelogs sum",
    billableFalseReport.total_minutes,
    totalNonBillableMinutes,
  );
  TestValidator.equals(
    "billable:false non_billable_minutes equals total_minutes",
    billableFalseReport.non_billable_minutes,
    billableFalseReport.total_minutes,
  );
  TestValidator.equals(
    "billable:false billable_minutes is zero",
    billableFalseReport.billable_minutes,
    0,
  );
  // 10. Validate unfiltered report results
  TestValidator.equals(
    "unfiltered total_minutes equals sum of all timelogs",
    unfilteredReport.total_minutes,
    expectedTotalMinutes,
  );
  TestValidator.equals(
    "unfiltered billable_minutes matches billable timelogs sum",
    unfilteredReport.billable_minutes,
    totalBillableMinutes,
  );
  TestValidator.equals(
    "unfiltered non_billable_minutes matches non-billable timelogs sum",
    unfilteredReport.non_billable_minutes,
    totalNonBillableMinutes,
  );
  // 11. Validate that filtered results sum to unfiltered results
  TestValidator.equals(
    "billable:true + billable:false total_minutes equals unfiltered total",
    billableTrueReport.total_minutes + billableFalseReport.total_minutes,
    unfilteredReport.total_minutes,
  );
  TestValidator.equals(
    "billable:true + billable:false billable_minutes equals unfiltered billable",
    billableTrueReport.billable_minutes + billableFalseReport.billable_minutes,
    unfilteredReport.billable_minutes,
  );
  TestValidator.equals(
    "billable:true + billable:false non_billable_minutes equals unfiltered non_billable",
    billableTrueReport.non_billable_minutes +
      billableFalseReport.non_billable_minutes,
    unfilteredReport.non_billable_minutes,
  );
  // 12. Test filter with groupBy: employee
  const employeeGroupedBillable =
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          dateFrom: new Date().toISOString().split("T")[0],
          dateTo: new Date().toISOString().split("T")[0],
          billable: true,
          groupBy: "employee",
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(employeeGroupedBillable);
  TestValidator.predicate(
    "employee groupBy with billable:true has employee reference",
    employeeGroupedBillable.employee !== null &&
      employeeGroupedBillable.employee !== undefined,
  );
  TestValidator.equals(
    "employee groupBy billable:true total_minutes matches",
    employeeGroupedBillable.total_minutes,
    totalBillableMinutes,
  );
  // 13. Test filter with groupBy: task (no task assigned, should still work)
  const taskGroupedBillable =
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          dateFrom: new Date().toISOString().split("T")[0],
          dateTo: new Date().toISOString().split("T")[0],
          billable: true,
          groupBy: "task",
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(taskGroupedBillable);
  // When no task is assigned, task field should be null
  TestValidator.predicate(
    "task groupBy with no tasks has null task reference",
    taskGroupedBillable.task === null || taskGroupedBillable.task === undefined,
  );
}
