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

export async function getErpHrmAdminProjectsProjectId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProject> {
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  const timelogAggregation = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: { erp_hrm_project_id: props.projectId },
    _sum: { duration_minutes: true },
  });
  const totalMinutes = timelogAggregation._sum.duration_minutes ?? 0;
  const actualHoursLogged = Math.round((totalMinutes / 60) * 10) / 10;
  let budgetUtilizationPercentage = 0;
  let budgetStatus: "within_budget" | "approaching_budget" | "over_budget" =
    "within_budget";
  if (
    project.budget_hours !== null &&
    project.budget_hours !== undefined &&
    project.budget_hours > 0
  ) {
    budgetUtilizationPercentage =
      Math.round((actualHoursLogged / project.budget_hours) * 100 * 10) / 10;
    if (actualHoursLogged > project.budget_hours) {
      budgetStatus = "over_budget";
    } else if (budgetUtilizationPercentage >= 80) {
      budgetStatus = "approaching_budget";
    } else {
      budgetStatus = "within_budget";
    }
  }
  const entry: IErpHrmProject.IEntry = {
    projectId: project.id,
    projectName: project.name,
    budgetHours: project.budget_hours ?? 0,
    actualHoursLogged: actualHoursLogged,
    budgetUtilizationPercentage: budgetUtilizationPercentage,
    budgetStatus: budgetStatus,
  };
  return {
    items: [entry],
    total: 1,
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
// export async function getErpHrmAdminProjectsProjectId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmProject> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------