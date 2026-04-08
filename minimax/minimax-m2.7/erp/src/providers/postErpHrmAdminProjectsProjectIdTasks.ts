import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTaskCollector } from "../collectors/ErpHrmTaskCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminProjectsProjectIdTasks(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.ICreate;
}): Promise<IErpHrmTask> {
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  const adminWithPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role: {
          erp_hrm_organization_id: project.erp_hrm_organization_id,
          employees: {
            some: {
              erp_hrm_member_id: props.admin.id,
            },
          },
        },
        permission: "project:manage",
      },
    });
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.admin.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
    },
    select: { id: true },
  });
  const isProjectLead = employee
    ? await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_project_id: props.projectId,
          assigned_role: "project_lead",
          erp_hrm_employee_id: employee.id,
        },
      })
    : null;
  if (!adminWithPermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.erpHrmEmployeeId) {
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_project_id: props.projectId,
          erp_hrm_employee_id: props.body.erpHrmEmployeeId,
        },
      });
    if (!projectMember) {
      throw new HttpException(
        "Assigned employee must be a project member",
        400,
      );
    }
  }
  if (props.body.parentId) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parentId,
        erp_hrm_project_id: props.projectId,
      },
    });
    if (!parentTask) {
      throw new HttpException(
        "Parent task must exist in the same project",
        400,
      );
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Parent task already has a parent (only one level of nesting allowed)",
        400,
      );
    }
  }
  await MyGlobal.prisma.erp_hrm_tasks.create({
    data: await ErpHrmTaskCollector.collect({
      body: props.body,
      erpHrmProjects: { id: props.projectId },
    }),
  });
  const totalTasks = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: { erp_hrm_project_id: props.projectId },
  });
  const statusCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { status: true },
  });
  const statusBreakdown: IErpHrmTask.IStatusBreakdown = {
    open: statusCounts.find((s) => s.status === "open")?._count.status ?? 0,
    inProgress:
      statusCounts.find((s) => s.status === "in-progress")?._count.status ?? 0,
    completed:
      statusCounts.find((s) => s.status === "completed")?._count.status ?? 0,
    closed: statusCounts.find((s) => s.status === "closed")?._count.status ?? 0,
  };
  const priorityCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { priority: true },
  });
  const priorityBreakdown: IErpHrmTask.IPriorityBreakdown = {
    low: priorityCounts.find((p) => p.priority === "low")?._count.priority ?? 0,
    medium:
      priorityCounts.find((p) => p.priority === "medium")?._count.priority ?? 0,
    high:
      priorityCounts.find((p) => p.priority === "high")?._count.priority ?? 0,
    urgent:
      priorityCounts.find((p) => p.priority === "urgent")?._count.priority ?? 0,
  };
  const completedCount = (statusBreakdown.completed +
    statusBreakdown.closed) as number & tags.Type<"int32"> & tags.Minimum<0>;
  const completionRate =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const avgResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: {
      erp_hrm_project_id: props.projectId,
      estimated_hours: { not: null },
    },
    _avg: { estimated_hours: true },
  });
  const averageEstimatedHours = avgResult._avg.estimated_hours ?? 0;
  const now = new Date();
  const overdueTasks = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: {
      erp_hrm_project_id: props.projectId,
      due_date: { lt: now },
      status: { notIn: ["completed", "closed"] },
    },
  });
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["created_at"],
    where: {
      erp_hrm_project_id: props.projectId,
      created_at: { gte: thirtyDaysAgo },
    },
    _count: { created_at: true },
  });
  const dateMap = new Map<string, number>();
  for (const item of dailyCounts) {
    const dateStr = item.created_at.toISOString().split("T")[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + item._count.created_at);
  }
  const temporalTrend: IErpHrmTask.ITemporalTrendItem[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    temporalTrend.push({
      count: (dateMap.get(dateStr) ?? 0) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      date: dateStr as string & tags.Format<"date">,
    });
  }
  return {
    totalTasks: totalTasks as number & tags.Type<"int32"> & tags.Minimum<0>,
    statusBreakdown,
    priorityBreakdown,
    completionRate: completionRate as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    averageEstimatedHours: averageEstimatedHours as number & tags.Minimum<0>,
    overdueTasks: overdueTasks as number & tags.Type<"int32"> & tags.Minimum<0>,
    temporalTrend,
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
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminProjectsProjectIdTasks(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmTask.ICreate;
// }): Promise<IErpHrmTask> {
//   await MyGlobal.prisma.erp_hrm_tasks.create({
//     data: await ErpHrmTaskCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------