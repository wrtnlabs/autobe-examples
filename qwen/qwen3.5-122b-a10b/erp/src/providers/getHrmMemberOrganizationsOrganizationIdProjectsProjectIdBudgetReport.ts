import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
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

export async function getHrmMemberOrganizationsOrganizationIdProjectsProjectIdBudgetReport(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmProject.IBudgetReport> {
  const projectWhereInput = {
    id: props.projectId,
    hrm_organization_id: props.organizationId,
    deleted_at: null,
  } satisfies Prisma.hrm_projectsWhereInput;
  const project = await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: projectWhereInput,
    select: {
      id: true,
      budget_hours: true,
    },
  });
  if (project.budget_hours === null || project.budget_hours === undefined) {
    throw new HttpException("Project has no budget hours defined", 404);
  }
  const timelogs = await MyGlobal.prisma.hrm_timelogs.findMany({
    where: {
      hrm_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogs.reduce(
    (sum, tl) => sum + tl.duration_minutes,
    0,
  );
  const actualHours = totalMinutes / 60;
  const budgetHours = project.budget_hours;
  const percentageConsumed = (actualHours / budgetHours) * 100;
  return {
    budgetHours: budgetHours,
    actualHours: actualHours,
    percentageConsumed: percentageConsumed,
  } satisfies IHrmProject.IBudgetReport;
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
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdProjectsProjectIdBudgetReport(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IHrmProject.IBudgetReport> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------