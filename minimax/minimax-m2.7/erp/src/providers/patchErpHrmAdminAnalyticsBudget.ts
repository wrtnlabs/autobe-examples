import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmBudgetAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmBudgetAnalysis";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminAnalyticsBudget(props: {
  admin: AdminPayload;
  body: IErpHrmBudgetAnalysis.IRequest;
}): Promise<IErpHrmBudgetAnalysis.IResult> {
  // Pagination defaults (page is 1-indexed)
  const page = (props.body.page ?? 1) as number;
  const limit = (props.body.limit ?? 100) as number;
  const skip = (page - 1) * limit;
  // Build WHERE clause: projects with budget_hours defined (IS NOT NULL AND > 0)
  const whereClause = {
    budget_hours: { not: null, gt: 0 },
    ...(props.body.projectIds && props.body.projectIds.length > 0
      ? { id: { in: props.body.projectIds } }
      : {}),
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  // Step 1: Get all projects with budget_hours (for aggregate calculation)
  // We need all to compute utilization, then sort and paginate in memory
  const allProjects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereClause,
    ...ErpHrmProjectAtSummaryTransformer.select(),
  });
  // Step 2: Get timelog aggregates for these projects
  const projectTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_project_id"],
    _sum: { duration_minutes: true },
    where: {
      erp_hrm_project_id: { in: allProjects.map((p) => p.id) },
    },
  });
  // Create lookup map: projectId -> total minutes
  const timelogMap = new Map<string, number>();
  for (const pt of projectTimelogs) {
    timelogMap.set(pt.erp_hrm_project_id, pt._sum.duration_minutes ?? 0);
  }
  // Step 3: Calculate utilization for each project and sort by utilization descending
  const projectsWithUtilization = allProjects
    .map((project) => {
      const budgetHours = project.budget_hours as number;
      const actualMinutes = timelogMap.get(project.id) ?? 0;
      const actualHours = actualMinutes / 60;
      const utilization = Math.round((actualHours / budgetHours) * 1000) / 10;
      return { project, budgetHours, actualHours, utilization };
    })
    .sort((a, b) => b.utilization - a.utilization);
  // Step 4: Apply pagination to get the single result
  const paginatedResults = projectsWithUtilization.slice(skip, skip + limit);
  const result = paginatedResults[0];
  if (!result) {
    throw new HttpException(
      "No projects found with budget hours configured",
      404,
    );
  }
  const { project, budgetHours, actualHours, utilization } = result;
  // Step 5: Determine budget status
  let budgetStatus: "within_budget" | "approaching_budget" | "over_budget";
  if (utilization < 80) {
    budgetStatus = "within_budget";
  } else if (utilization <= 100) {
    budgetStatus = "approaching_budget";
  } else {
    budgetStatus = "over_budget";
  }
  // Step 6: Transform project using transformer
  const transformedProject =
    await ErpHrmProjectAtSummaryTransformer.transform(project);
  return {
    project: transformedProject,
    budgetHours: budgetHours,
    actualHours: actualHours,
    utilizationPercentage: utilization,
    budgetStatus: budgetStatus,
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
// import { IErpHrmBudgetAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmBudgetAnalysis";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminAnalyticsBudget(props: {
//   admin: AdminPayload;
//   body: IErpHrmBudgetAnalysis.IRequest;
// }): Promise<IErpHrmBudgetAnalysis.IResult> {
//   return {
//     project: await ErpHrmProjectAtSummaryTransformer.transform(...),
//     budgetHours: ...,
//     actualHours: ...,
//     utilizationPercentage: ...,
//     budgetStatus: ...,
//   };
// }
// ```
//--------------------------------------------------------------