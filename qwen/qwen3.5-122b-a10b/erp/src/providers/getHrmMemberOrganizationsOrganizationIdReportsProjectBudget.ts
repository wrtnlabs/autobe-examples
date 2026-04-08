import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
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

export async function getHrmMemberOrganizationsOrganizationIdReportsProjectBudget(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmProjectBudgetReport[]> {
  // Check if member has employee record in the organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Not a member of this organization", 403);
  }
  // Check report:view permission
  const hasPermission = await MyGlobal.prisma.hrm_role_permissions.findFirst({
    where: {
      hrm_role_id: employee.role_id,
      hrmPermission: {
        permission_name: "report:view",
      },
    },
  });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Query projects with budget hours and non-deleted timelogs
  const projects = await MyGlobal.prisma.hrm_projects.findMany({
    where: {
      hrm_organization_id: props.organizationId,
      budget_hours: {
        not: null,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      color_code: true,
      status: true,
      budget_hours: true,
      timelogs: {
        where: {
          deleted_at: null,
        },
        select: {
          duration_minutes: true,
        },
      },
    },
  });
  // Transform to report format
  const reports = projects.map((project) => {
    // Calculate actual hours from timelogs
    const actualHours =
      project.timelogs.reduce((sum, tl) => sum + tl.duration_minutes, 0) / 60;
    // Calculate percentage consumed with division by zero protection
    const percentageConsumed =
      project.budget_hours && project.budget_hours > 0
        ? (actualHours / project.budget_hours) * 100
        : 0;
    return {
      project_id: project.id,
      project_name: project.name,
      budget_hours: project.budget_hours ?? null,
      actual_hours: actualHours,
      percentage_consumed: percentageConsumed,
      project_color_code: project.color_code,
      project_status: project.status,
    } satisfies IHrmProjectBudgetReport;
  });
  return reports;
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
// import { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdReportsProjectBudget(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<IHrmProjectBudgetReport> {
//   const record = await MyGlobal.prisma.hrm_projects.findFirstOrThrow({
//     ...HrmProjectBudgetReportTransformer.select(),
//     where: { ... },
//   });
//   return await HrmProjectBudgetReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------