import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminProjectsAnalyticsBudget(props: {
  admin: AdminPayload;
}): Promise<IErpHrmProject> {
  // Query all projects with budget hours configured
  // Note: erp_hrm_admins table has no organization relation in schema,
  // so returning system-wide project budget data
  const projects = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: {
      budget_hours: {
        not: null,
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  if (projects.length === 0) {
    return {
      items: [],
      total: 0 satisfies number & tags.Type<"int32">,
    };
  }
  // Get all timelogs for these projects grouped by project_id
  const projectIds = projects.map((p) => p.id);
  const timelogAggregates = await MyGlobal.prisma.erp_hrm_timelogs.groupBy({
    by: ["erp_hrm_project_id"],
    where: {
      erp_hrm_project_id: {
        in: projectIds,
      },
    },
    _sum: {
      duration_minutes: true,
    },
  });
  // Create a map of project_id -> total_duration_minutes
  const timelogMap = new Map<string, number>();
  for (const aggregate of timelogAggregates) {
    timelogMap.set(
      aggregate.erp_hrm_project_id,
      aggregate._sum.duration_minutes ?? 0,
    );
  }
  // Calculate entries with budget utilization
  const entries: IErpHrmProject.IEntry[] = projects.map((project) => {
    const totalMinutes = timelogMap.get(project.id) ?? 0;
    const actualHoursLogged = Math.round((totalMinutes / 60) * 10) / 10;
    const budgetHours = project.budget_hours!;
    const budgetUtilizationPercentage =
      Math.round((actualHoursLogged / budgetHours) * 100 * 10) / 10;
    let budgetStatus: "within_budget" | "approaching_budget" | "over_budget";
    if (actualHoursLogged > budgetHours) {
      budgetStatus = "over_budget";
    } else if (budgetUtilizationPercentage >= 80) {
      budgetStatus = "approaching_budget";
    } else {
      budgetStatus = "within_budget";
    }
    return {
      projectId: project.id,
      projectName: project.name,
      budgetHours: budgetHours,
      actualHoursLogged: actualHoursLogged,
      budgetUtilizationPercentage: budgetUtilizationPercentage,
      budgetStatus: budgetStatus,
    } satisfies IErpHrmProject.IEntry;
  });
  // Sort by budget_utilization_percentage descending
  entries.sort(
    (a, b) => b.budgetUtilizationPercentage - a.budgetUtilizationPercentage,
  );
  return {
    items: entries,
    total: entries.length satisfies number & tags.Type<"int32">,
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
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmAdminProjectsAnalyticsBudget(props: {
//   admin: AdminPayload;
// }): Promise<IErpHrmProject> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------