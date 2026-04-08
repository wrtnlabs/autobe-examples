import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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

export async function putErpHrmAdminProjectsProjectIdTasksTaskId(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IUpdate;
}): Promise<IErpHrmTask> {
  // Step 1: Verify task exists and belongs to the specified project
  const existingTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
      status: true,
      project: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (!existingTask || existingTask.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Task not found in the specified project", 404);
  }
  const organizationId = existingTask.project.erp_hrm_organization_id;
  const previousStatus = existingTask.status;
  // Step 2: Authorization - admin must have project:manage permission OR be project-lead
  const adminEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.admin.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!adminEmployee) {
    throw new HttpException("Forbidden", 403);
  }
  const hasProjectManagePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: adminEmployee.erp_hrm_role_id,
        permission: "project:manage",
      },
    });
  let isProjectLead = false;
  if (!hasProjectManagePermission) {
    const projectLeadMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: adminEmployee.id,
          erp_hrm_project_id: props.projectId,
          assigned_role: "project_lead",
        },
      });
    isProjectLead = projectLeadMembership !== null;
  }
  if (!hasProjectManagePermission && !isProjectLead) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate erp_hrm_employee_id if provided - must be a project member
  if (props.body.erp_hrm_employee_id !== undefined) {
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: props.body.erp_hrm_employee_id,
          erp_hrm_project_id: props.projectId,
        },
      });
    if (!projectMember) {
      throw new HttpException(
        "Cannot assign employee to task: employee is not a member of this project",
        400,
      );
    }
  }
  // Step 4: Validate parent_id if provided - must exist in same project, no circular reference
  if (props.body.parent_id !== undefined) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.parent_id },
      select: {
        id: true,
        erp_hrm_project_id: true,
        parent_id: true,
      },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found", 400);
    }
    if (parentTask.erp_hrm_project_id !== props.projectId) {
      throw new HttpException("Parent task must be in the same project", 400);
    }
    if (parentTask.id === props.taskId) {
      throw new HttpException("Task cannot be its own parent", 400);
    }
    if (parentTask.parent_id === props.taskId) {
      throw new HttpException("Circular parent reference detected", 400);
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Cannot create nested subtask: parent task is already a subtask",
        400,
      );
    }
  }
  // Step 5: Build update data object
  const updateData: {
    title?: string;
    description?: string;
    status?: "open" | "in-progress" | "completed" | "closed";
    priority?: "low" | "medium" | "high" | "urgent";
    estimated_hours?: number;
    due_date?: string;
    erp_hrm_employee_id?: string | null;
    parent_id?: string | null;
    updated_at?: string;
  } = {};
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.estimated_hours !== undefined) {
    updateData.estimated_hours = props.body.estimated_hours;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date;
  }
  if (props.body.erp_hrm_employee_id !== undefined) {
    updateData.erp_hrm_employee_id = props.body.erp_hrm_employee_id;
  }
  if (props.body.parent_id !== undefined) {
    updateData.parent_id = props.body.parent_id;
  }
  updateData.updated_at = new Date().toISOString();
  // Step 6: Update task with relational fields
  if (
    props.body.erp_hrm_employee_id !== undefined ||
    props.body.parent_id !== undefined
  ) {
    await MyGlobal.prisma.erp_hrm_tasks.update({
      where: { id: props.taskId },
      data: {
        ...(updateData.title !== undefined && { title: updateData.title }),
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.priority !== undefined && {
          priority: updateData.priority,
        }),
        ...(updateData.estimated_hours !== undefined && {
          estimated_hours: updateData.estimated_hours,
        }),
        ...(updateData.due_date !== undefined && {
          due_date: new Date(updateData.due_date),
        }),
        ...(updateData.erp_hrm_employee_id !== undefined && {
          erp_hrm_employee_id: updateData.erp_hrm_employee_id,
        }),
        ...(updateData.parent_id !== undefined && {
          parent_id: updateData.parent_id,
        }),
        updated_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.erp_hrm_tasks.update({
      where: { id: props.taskId },
      data: {
        ...(updateData.title !== undefined && { title: updateData.title }),
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.priority !== undefined && {
          priority: updateData.priority,
        }),
        ...(updateData.estimated_hours !== undefined && {
          estimated_hours: updateData.estimated_hours,
        }),
        ...(updateData.due_date !== undefined && {
          due_date: new Date(updateData.due_date),
        }),
        updated_at: new Date(),
      },
    });
  }
  // Step 7: Record status change in task history if status changed
  const newStatus = props.body.status ?? previousStatus;
  const statusChanged = previousStatus !== newStatus;
  if (statusChanged) {
    await MyGlobal.prisma.erp_hrm_task_histories.create({
      data: {
        id: v4(),
        erp_hrm_task_id: props.taskId,
        erp_hrm_member_id: props.admin.id,
        previous_status: previousStatus,
        new_status: newStatus,
        created_at: new Date(),
      },
    });
  }
  // Step 8: Compute analytics response
  const totalTasks = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: { erp_hrm_project_id: props.projectId },
  });
  const statusCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { status: true },
  });
  const statusBreakdown: IErpHrmTask.IStatusBreakdown = {
    open: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
  };
  for (const item of statusCounts) {
    if (item.status === "open") {
      statusBreakdown.open = item._count.status;
    } else if (item.status === "in-progress") {
      statusBreakdown.inProgress = item._count.status;
    } else if (item.status === "completed") {
      statusBreakdown.completed = item._count.status;
    } else if (item.status === "closed") {
      statusBreakdown.closed = item._count.status;
    }
  }
  const priorityCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["priority"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { priority: true },
  });
  const priorityBreakdown: IErpHrmTask.IPriorityBreakdown = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  for (const item of priorityCounts) {
    if (item.priority === "low") {
      priorityBreakdown.low = item._count.priority;
    } else if (item.priority === "medium") {
      priorityBreakdown.medium = item._count.priority;
    } else if (item.priority === "high") {
      priorityBreakdown.high = item._count.priority;
    } else if (item.priority === "urgent") {
      priorityBreakdown.urgent = item._count.priority;
    }
  }
  const completedCount = statusBreakdown.completed + statusBreakdown.closed;
  const completionRate =
    totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const estimatedHoursResult = await MyGlobal.prisma.erp_hrm_tasks.aggregate({
    where: {
      erp_hrm_project_id: props.projectId,
      estimated_hours: { not: null },
    },
    _avg: { estimated_hours: true },
  });
  const averageEstimatedHours = estimatedHoursResult._avg.estimated_hours ?? 0;
  const nowISO = new Date().toISOString();
  const overdueTasks = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: {
      erp_hrm_project_id: props.projectId,
      due_date: { lt: nowISO },
      status: { notIn: ["completed", "closed"] },
    },
  });
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: {
      erp_hrm_project_id: props.projectId,
      created_at: { gte: thirtyDaysAgo },
    },
    select: { created_at: true },
    orderBy: { created_at: "asc" },
  });
  const dateCountMap = new Map<string, number>();
  for (const task of recentTasks) {
    const dateKey = task.created_at.toISOString().split("T")[0];
    dateCountMap.set(dateKey, (dateCountMap.get(dateKey) ?? 0) + 1);
  }
  const temporalTrend: IErpHrmTask.ITemporalTrendItem[] = [];
  for (const [date, count] of dateCountMap) {
    temporalTrend.push({
      date: date as string & tags.Format<"date">,
      count: count as number & tags.Type<"int32"> & tags.Minimum<0>,
    });
  }
  temporalTrend.sort((a, b) => a.date.localeCompare(b.date));
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
// export async function putErpHrmAdminProjectsProjectIdTasksTaskId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IErpHrmTask.IUpdate;
// }): Promise<IErpHrmTask> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------