import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectBudgetReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberReportsProjectBudget(props: {
  member: MemberPayload;
}): Promise<IErpHrmProjectBudgetReport> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const projects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: {
      organization_id: organizationId,
      deleted_at: null,
      budget_hours: { not: null },
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
      status: true,
    },
  });
  const projectIds = projects.map((p) => p.id);
  const timelogAggregates =
    projectIds.length > 0
      ? await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
          by: ["project_id"],
          where: {
            project_id: { in: projectIds },
            deleted_at: null,
          },
          _sum: {
            duration_minutes: true,
          },
        })
      : [];
  const actualHoursByProject = new Map<string, number>();
  for (const agg of timelogAggregates) {
    actualHoursByProject.set(
      agg.project_id,
      (agg._sum.duration_minutes ?? 0) / 60,
    );
  }
  const items: IErpHrmProjectBudgetReport.IItem[] = projects.map((project) => {
    const budgetHours = project.budget_hours ?? 0;
    const actualHours = actualHoursByProject.get(project.id) ?? 0;
    const utilizationPercentage =
      budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
    return {
      project_id: project.id,
      project_name: project.name,
      budget_hours: budgetHours,
      actual_hours: actualHours,
      utilization_percentage: utilizationPercentage,
      project_status: project.status,
    } satisfies IErpHrmProjectBudgetReport.IItem;
  });
  const totalBudgetHours = items.reduce(
    (sum, item) => sum + item.budget_hours,
    0,
  );
  const totalActualHours = items.reduce(
    (sum, item) => sum + item.actual_hours,
    0,
  );
  const overallUtilization =
    totalBudgetHours > 0 ? (totalActualHours / totalBudgetHours) * 100 : 0;
  return {
    projects: items,
    summary: {
      total_budget_hours: totalBudgetHours,
      total_actual_hours: totalActualHours,
      overall_utilization: overallUtilization,
    } satisfies IErpHrmProjectBudgetReport.ISummary,
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
// import { IErpHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectBudgetReport";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberReportsProjectBudget(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmProjectBudgetReport> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------