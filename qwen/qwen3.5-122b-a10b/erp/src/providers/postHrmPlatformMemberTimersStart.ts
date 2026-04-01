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
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check for existing active timer (single active timer enforcement)
  const existingTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
  });
  if (existingTimer) {
    throw new HttpException("You already have an active timer", 409);
  }
  // Validate project exists and is active
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.body.project_id },
    select: { id: true, status: true, hrm_platform_organization_id: true },
  });
  if (!project) {
    throw new HttpException("Project not found", 404);
  }
  if (project.status !== "active") {
    throw new HttpException("Project is not active", 422);
  }
  // Verify employee is assigned to the project
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.body.project_id,
        deleted_at: null,
      },
    });
  if (!projectMember) {
    throw new HttpException("You are not assigned to this project", 403);
  }
  // Validate task if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { id: true, hrm_platform_projects_id: true },
    });
    if (!task) {
      throw new HttpException("Task not found", 404);
    }
    if (task.hrm_platform_projects_id !== props.body.project_id) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  // Create timer
  const timer = await MyGlobal.prisma.hrm_platform_timers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      employee_id: employee.id,
      project_id: props.body.project_id,
      task_id: props.body.task_id ?? null,
      started_at: new Date(),
      stopped_at: null,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(timer);
}
