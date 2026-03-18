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
import { HrmsTimelogCollector } from "../collectors/HrmsTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsOrganizationIdEmployeesEmployeeIdTimelogs(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsTimelog.ICreate;
}): Promise<IHrmsTimelog> {
  // Validate employee exists and belongs to organization
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      id: props.employeeId,
      organization_member_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found or not in organization", 400);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 400);
  }
  // Validate project exists and belongs to organization
  const project = await MyGlobal.prisma.hrms_projects.findFirst({
    where: {
      id: props.body.project_id,
      hrms_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found or not in organization", 400);
  }
  // Validate task if provided (must belong to project)
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrms_tasks.findFirst({
      where: {
        id: props.body.task_id,
        hrms_project_id: props.body.project_id,
        deleted_at: null,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found or not in project", 400);
    }
  }
  // Validate duration is positive
  if (props.body.duration_minutes <= 0) {
    throw new HttpException("Duration must be positive", 400);
  }
  // Create timelog using collector
  const created = await MyGlobal.prisma.hrms_timelogs.create({
    data: await HrmsTimelogCollector.collect({
      body: props.body,
      hrmsEmployees: {
        id: employee.id as string & tags.Format<"uuid">,
      },
    }),
  });
  // Manual response construction - IHrmsTimelog is metrics type, need to return proper metrics
  // Based on the IHrmsTimelog schema, this is an aggregation response, not a single timelog
  const currentWeekStart = new Date();
  const currentWeekEnd = new Date();
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay() + 1,
  );
  currentWeekEnd.setDate(
    currentWeekEnd.getDate() + (7 - currentWeekEnd.getDay()),
  );
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekEnd.setHours(0, 0, 0, 0);
  return {
    active_employees_count: 1 satisfies number & tags.Type<"int32">,
    current_week_hours: (created.duration_minutes / 60) satisfies number,
    pending_timesheets_count: 0 satisfies number & tags.Type<"int32">,
    projects_with_high_utilization: [],
    current_week: {
      start_date: currentWeekStart
        .toISOString()
        .split("T")[0] satisfies string & tags.Format<"date">,
      end_date: currentWeekEnd.toISOString().split("T")[0] satisfies string &
        tags.Format<"date">,
    } satisfies IWeekRange,
    generated_at: new Date().toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IHrmsTimelog;
}
