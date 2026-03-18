import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimersStart(props: {
  member: MemberPayload;
  body: IHrmPlatformTimer.IStart;
}): Promise<IHrmPlatformTimer> {
  // Find employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check for existing active timer (single active timer enforcement)
  const existingActiveTimer =
    await MyGlobal.prisma.hrm_platform_timers.findFirst({
      where: {
        employee_id: employee.id,
        stopped_at: null,
        deleted_at: null,
      },
    });
  if (existingActiveTimer !== null) {
    throw new HttpException(
      "Employee already has an active timer. Stop or discard the existing timer before starting a new one.",
      409,
    );
  }
  // Validate project exists and employee is assigned to it
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.body.project_id,
        hrm_platform_employee_id: employee.id,
      },
    });
  if (projectMember === null) {
    throw new HttpException("You are not assigned to this project", 403);
  }
  // Validate project status is active
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: {
      id: props.body.project_id,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      "Project is not active and cannot accept new timers",
      422,
    );
  }
  // Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: {
        id: props.body.task_id,
      },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    if (task.hrm_platform_projects_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Create timer record
  const now = toISOStringSafe(new Date());
  const timerId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const timer = await MyGlobal.prisma.hrm_platform_timers.create({
    data: {
      id: timerId,
      employee_id: employee.id,
      project_id: props.body.project_id,
      task_id: props.body.task_id ?? null,
      started_at: now,
      stopped_at: null,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(timer);
}
