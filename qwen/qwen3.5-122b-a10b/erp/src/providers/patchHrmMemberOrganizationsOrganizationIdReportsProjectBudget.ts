import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectBudgetReport";
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

export async function patchHrmMemberOrganizationsOrganizationIdReportsProjectBudget(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmProjectBudgetReport.IRequest;
}): Promise<IPageIHrmProjectBudgetReport.ISummary> {
  // Validate organization exists
  await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId, deleted_at: null },
  });
  // Find employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      role: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Not a member of this organization", 403);
  }
  // Check if role has report:view permission
  const rolePermissions = await MyGlobal.prisma.hrm_role_permissions.findMany({
    where: { hrm_role_id: employee.role.id },
    select: {
      hrm_permission_id: true,
    },
  });
  const permissionIds = rolePermissions.map((rp) => rp.hrm_permission_id);
  // Query permissions to check for report:view
  const permissions = await MyGlobal.prisma.hrm_permissions.findMany({
    where: {
      id: {
        in: permissionIds,
      },
    },
    select: {
      id: true,
      permission_name: true,
    },
  });
  const hasReportViewPermission = permissions.some(
    (p) => p.permission_name === "report:view",
  );
  if (!hasReportViewPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Build project where clause
  const projectWhere: Prisma.hrm_projectsWhereInput = {
    hrm_organization_id: props.organizationId,
    deleted_at: null,
    budget_hours: { not: null },
    ...(props.body.status && { status: props.body.status }),
  };
  // Get all project IDs in the organization for timelog filtering
  const projectIds = await MyGlobal.prisma.hrm_projects
    .findMany({
      where: {
        hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    })
    .then((projects) => projects.map((p) => p.id));
  // Build timelog where clause
  const timelogWhere: Prisma.hrm_timelogsWhereInput = {
    deleted_at: null,
    hrm_project_id: {
      in: projectIds,
    },
  };
  // Apply date range filter
  if (props.body.date_range) {
    const dateFilters: Prisma.hrm_timelogsWhereInput[] = [];
    if (props.body.date_range.start) {
      dateFilters.push({
        date: {
          gte: new Date(props.body.date_range.start),
        },
      });
    }
    if (props.body.date_range.end) {
      dateFilters.push({
        date: {
          lte: new Date(props.body.date_range.end),
        },
      });
    }
    if (dateFilters.length > 0) {
      timelogWhere.AND = dateFilters;
    }
  }
  // Apply billable filter
  if (props.body.billable !== undefined) {
    timelogWhere.billable = props.body.billable;
  }
  // Get pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get all projects with budget
  const projects = await MyGlobal.prisma.hrm_projects.findMany({
    where: projectWhere,
    select: {
      id: true,
      name: true,
      budget_hours: true,
      status: true,
    },
  });
  // For each project, calculate actual hours from timelogs
  const projectBudgets = await ArrayUtil.asyncMap(projects, async (project) => {
    const timelogAgg = await MyGlobal.prisma.hrm_timelogs.aggregate({
      where: {
        ...timelogWhere,
        hrm_project_id: project.id,
      },
      _sum: {
        duration_minutes: true,
      },
    });
    const actualHours = (timelogAgg._sum.duration_minutes ?? 0) / 60;
    const budgetHours = project.budget_hours ?? 0;
    const utilizationPercentage =
      budgetHours > 0 ? (actualHours / budgetHours) * 100 : 0;
    return {
      id: project.id,
      name: project.name,
      budget_hours: budgetHours,
      actual_hours: actualHours,
      utilization_percentage: utilizationPercentage,
      status: project.status,
    } satisfies IHrmProjectBudgetReport.ISummary;
  });
  // Get total count
  const total = projectBudgets.length;
  // Apply pagination
  const paginatedData = projectBudgets.slice(skip, skip + limit);
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmProjectBudgetReport.ISummary;
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
// import { IPageIHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectBudgetReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdReportsProjectBudget(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmProjectBudgetReport.IRequest;
// }): Promise<IPageIHrmProjectBudgetReport.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------