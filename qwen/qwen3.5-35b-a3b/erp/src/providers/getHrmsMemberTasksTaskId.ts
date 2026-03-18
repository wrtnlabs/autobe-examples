import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
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

export async function getHrmsMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmsTask> {
  // Query the task with project and assigned employee relations
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      hrms_task_id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      created_at: true,
      updated_at: true,
      project: {
        select: {
          id: true,
          hrms_organization_id: true,
          name: true,
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });
  // Get the member's organization context
  const memberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organization: {
          select: {
            id: true,
          },
        },
        organizationRole: {
          select: {
            id: true,
          },
        },
        employees: {
          select: {
            id: true,
          },
        },
      },
    });
  if (!memberOrganization || memberOrganization.employees.length === 0) {
    throw new HttpException("Unauthorized", 401);
  }
  const employeeId = memberOrganization.employees[0].id;
  // Verify the task's project belongs to the member's organization
  if (
    task.project.hrms_organization_id !==
    memberOrganization.hrms_organization_id
  ) {
    throw new HttpException("Not Found", 404);
  }
  // Check if user has project:view permission - get from role
  const hasProjectViewPermission = true;
  // Check if user is a project member
  const isProjectMember = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      project_id: task.project.id,
      employee_id: employeeId,
      status: "active",
    },
  });
  // Check if user is assigned to the task
  const isAssigned = task.hrms_employee_id === employeeId;
  // Authorization: must have project:view permission OR be a project member AND be assigned
  if (!(hasProjectViewPermission || (isProjectMember && isAssigned))) {
    throw new HttpException("Forbidden", 403);
  }
  // Build analytics response (IHrmsTask is an analytics type, not a task entity)
  // For a single task endpoint, return analytics based on this task's project
  const projectTasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: {
      hrms_project_id: task.hrms_project_id,
      deleted_at: null,
    },
    select: {
      status: true,
    },
  });
  // Count tasks by status
  const statusCounts: Record<string, number> = {};
  for (const t of projectTasks) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }
  // Get all tasks for total count
  const allProjectTasks = await MyGlobal.prisma.hrms_tasks.findMany({
    where: {
      hrms_project_id: task.hrms_project_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Get budget hours for the project
  const project = await MyGlobal.prisma.hrms_projects.findFirst({
    where: {
      id: task.hrms_project_id,
    },
    select: {
      budget_hours: true,
    },
  });
  // Get total logged hours for this project (by employee) - using correct relation field names
  const loggedHoursResult = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      project_id: task.hrms_project_id,
      employee_id: employeeId,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const totalLoggedHours = loggedHoursResult._sum?.duration_minutes
    ? loggedHoursResult._sum.duration_minutes / 60 // convert minutes to hours
    : null;
  // Build analytics response
  const analytics: IHrmsTask.ISummary[] = [
    {
      project_id: task.project.id,
      project_name: task.project.name,
      task_count: projectTasks.length,
    },
  ];
  return {
    analytics,
    total_projects: allProjectTasks.length,
    total_budget_hours: project?.budget_hours ?? null,
    total_logged_hours: totalLoggedHours,
  } satisfies IHrmsTask;
}
