import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsProjectIdReportsBudget(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectBudgetReport> {
  // 1. Verify session is active (not expired)
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        hrm_platform_member_id: props.member.id,
        expired_at: { gte: new Date() },
      },
      select: { id: true },
    });
  // 2. Fetch project with all required fields
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
    },
  );
  // 3. Check access: must have active project membership OR built-in role (Manager/Owner)
  const membershipCount =
    await MyGlobal.prisma.hrm_platform_project_memberships.count({
      where: {
        project: { id: props.projectId },
        employee: { hrm_platform_member_id: props.member.id },
        deleted_at: null,
      },
    });
  if (membershipCount === 0) {
    // Check if member has built-in role (Manager/Owner) in the project's organization
    const builtInRoleCount = await MyGlobal.prisma.hrm_platform_employees.count(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          hrm_platform_organization_id: project.hrm_platform_organization_id,
          role: { built_in: true },
        },
      },
    );
    if (builtInRoleCount === 0) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Fetch all non-deleted timelogs for this project with employee data
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      project: { id: props.projectId },
      deleted_at: null,
    },
    select: {
      duration_minutes: true,
      billable: true,
      employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
    },
  });
  // 5. Compute actual hours and utilization percentage
  const actualHours =
    timelogs.length === 0
      ? 0
      : timelogs.reduce((sum, tl) => sum + tl.duration_minutes, 0) / 60;
  const utilizationPercent =
    project.budget !== null && project.budget > 0
      ? (actualHours / project.budget) * 100
      : null;
  // 6. Employee breakdowns: group by employee_id
  const employeeMap = new Map<
    string,
    {
      durationMinutes: number;
      count: number;
      employee: (typeof timelogs)[number]["employee"];
    }
  >();
  for (const tl of timelogs) {
    const existing = employeeMap.get(tl.employee.id);
    if (existing === undefined) {
      employeeMap.set(tl.employee.id, {
        durationMinutes: tl.duration_minutes,
        count: 1,
        employee: tl.employee,
      });
    } else {
      existing.durationMinutes += tl.duration_minutes;
      existing.count += 1;
    }
  }
  const employee_breakdowns = await ArrayUtil.asyncMap(
    Array.from(employeeMap.values()),
    async (entry) =>
      ({
        employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
          entry.employee,
        ),
        hours: entry.durationMinutes / 60,
        timelog_count:
          entry.count satisfies IHrmPlatformProjectBudgetReport.IEmployeeBreakdown["timelog_count"],
      }) satisfies IHrmPlatformProjectBudgetReport.IEmployeeBreakdown,
  );
  // 7. Billable breakdowns: group by billable flag
  const billableMap = new Map<
    boolean,
    {
      durationMinutes: number;
      count: number;
    }
  >();
  for (const tl of timelogs) {
    const existing = billableMap.get(tl.billable);
    if (existing === undefined) {
      billableMap.set(tl.billable, {
        durationMinutes: tl.duration_minutes,
        count: 1,
      });
    } else {
      existing.durationMinutes += tl.duration_minutes;
      existing.count += 1;
    }
  }
  const billable_breakdowns = Array.from(billableMap.entries()).map(
    ([billable, agg]) => ({
      billable,
      total_hours: agg.durationMinutes / 60,
      timelog_count:
        agg.count satisfies IHrmPlatformProjectBudgetReport.IBillableBreakdown["timelog_count"],
    }),
  ) satisfies IHrmPlatformProjectBudgetReport.IBillableBreakdown[];
  // 8. Build result object
  return {
    id: project.id,
    name: project.name,
    color_code: project.color_code,
    budget: project.budget,
    status: project.status,
    start_date: toISOStringSafe(project.start_date ?? new Date()),
    end_date: toISOStringSafe(project.end_date ?? new Date()),
    actual_hours: actualHours,
    utilization_percent: utilizationPercent,
    employee_breakdowns,
    billable_breakdowns,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetReport";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberProjectsProjectIdReportsBudget(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformProjectBudgetReport> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------