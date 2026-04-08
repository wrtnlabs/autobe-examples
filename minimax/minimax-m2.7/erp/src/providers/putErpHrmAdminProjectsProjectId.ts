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

export async function putErpHrmAdminProjectsProjectId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProject.IUpdate;
}): Promise<IErpHrmProject> {
  // Fetch current project
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
      budget_hours: true,
    },
  });
  // Validation: Status transition rules
  if (props.body.status !== undefined && props.body.status !== project.status) {
    const validTransitions: Record<string, string[]> = {
      active: ["archived", "completed"],
      archived: ["active", "completed"],
      completed: ["archived"],
    };
    const allowed = validTransitions[project.status] ?? [];
    if (!allowed.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${project.status} to ${props.body.status}`,
        400,
      );
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.erp_hrm_projectsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.color !== undefined) {
    updateData.color = props.body.color;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.budgetHours !== undefined) {
    updateData.budget_hours = props.body.budgetHours;
  }
  if (props.body.startDate !== undefined) {
    updateData.start_date = props.body.startDate;
  }
  if (props.body.endDate !== undefined) {
    updateData.end_date = props.body.endDate;
  }
  // Update project
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Calculate budget utilization for this project
  const timelogsResult = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: { erp_hrm_project_id: props.projectId },
    _sum: { duration_minutes: true },
  });
  const actualMinutes = timelogsResult._sum.duration_minutes ?? 0;
  const actualHoursLogged = Math.round((actualMinutes / 60) * 10) / 10;
  const budgetHours = project.budget_hours ?? 0;
  const budgetUtilizationPercentage =
    budgetHours > 0
      ? Math.round((actualHoursLogged / budgetHours) * 1000) / 10
      : 0;
  let budgetStatus: "within_budget" | "approaching_budget" | "over_budget";
  if (actualHoursLogged > budgetHours) {
    budgetStatus = "over_budget";
  } else if (budgetUtilizationPercentage >= 80) {
    budgetStatus = "approaching_budget";
  } else {
    budgetStatus = "within_budget";
  }
  return {
    items: [
      {
        projectId: props.projectId,
        projectName: props.body.name ?? project.name,
        budgetHours: budgetHours,
        actualHoursLogged: actualHoursLogged,
        budgetUtilizationPercentage: budgetUtilizationPercentage,
        budgetStatus: budgetStatus,
      } satisfies IErpHrmProject.IEntry,
    ],
    total: 1 satisfies number & tags.Type<"int32">,
  } satisfies IErpHrmProject;
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
// export async function putErpHrmAdminProjectsProjectId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmProject.IUpdate;
// }): Promise<IErpHrmProject> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------