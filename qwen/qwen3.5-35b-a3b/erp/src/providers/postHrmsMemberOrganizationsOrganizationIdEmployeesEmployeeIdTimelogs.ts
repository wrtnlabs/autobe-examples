import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function postHrmsMemberOrganizationsOrganizationIdEmployeesEmployeeIdTimelogs(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsTimelog.ICreate;
}): Promise<IHrmsTimelog> {
  // Validate employee exists and belongs to the organization
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      id: props.employeeId,
      deleted_at: null,
      organizationMember: {
        hrms_organization_id: props.organizationId,
        deleted_at: null,
      },
    },
    select: {
      id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found or not in organization", 400);
  }
  if (employee.status === "deactivated") {
    throw new HttpException("Employee is deactivated", 400);
  }
  // Validate project exists and belongs to the organization
  const project = await MyGlobal.prisma.hrms_projects.findFirst({
    where: {
      id: props.body.project_id,
      hrms_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found or not in organization", 400);
  }
  // Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrms_tasks.findFirst({
      where: {
        id: props.body.task_id,
        hrms_project_id: props.body.project_id,
        deleted_at: null,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found or not in project", 400);
    }
  }
  // Create timelog record
  const created = await MyGlobal.prisma.hrms_timelogs.create({
    data: {
      id: v4(),
      employee: { connect: { id: props.employeeId } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
      billable: props.body.billable,
      created_at: new Date(),
      date: new Date(props.body.date),
      description: props.body.description ?? null,
      duration_minutes: props.body.duration_minutes,
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Compute current week (Monday-Sunday) from Asia/Seoul timezone
  const now = new Date();
  const utcOffset = 9 * 60 * 60 * 1000; // KST offset
  const kstDate = new Date(now.getTime() + utcOffset);
  const dayOfWeek = kstDate.getDay(); // 0 = Sunday, 1 = Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(kstDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const current_week: IWeekRange = {
    start_date: monday.toISOString().split("T")[0],
    end_date: sunday.toISOString().split("T")[0],
  };
  // Return aggregated metrics (IHrmsTimelog is metrics type, not single timelog)
  return {
    active_employees_count: 0,
    current_week_hours: created.duration_minutes / 60,
    pending_timesheets_count: 0,
    projects_with_high_utilization: [],
    current_week,
    generated_at: toISOStringSafe(kstDate),
  };
}
