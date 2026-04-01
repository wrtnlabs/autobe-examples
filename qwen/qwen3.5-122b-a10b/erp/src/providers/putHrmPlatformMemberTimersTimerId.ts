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

export async function putHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimer.IUpdate;
}): Promise<IHrmPlatformTimer> {
  // Step 1: Get employee record for authenticated member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 2: Fetch timer by timerId
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUnique({
    where: { id: props.timerId },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      stopped_at: true,
      deleted_at: true,
    },
  });
  // Step 3: Verify timer exists
  if (timer === null) {
    throw new HttpException("Timer not found", 404);
  }
  // Step 4: Verify timer belongs to current employee
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Verify timer is still running (not stopped)
  if (timer.stopped_at !== null) {
    throw new HttpException("Cannot update a stopped timer", 400);
  }
  // Step 6: Verify timer is not soft-deleted
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer is deleted", 400);
  }
  // Step 7: Validate project_id if provided
  if (props.body.project_id !== undefined) {
    const newProject = await MyGlobal.prisma.hrm_platform_projects.findUnique({
      where: { id: props.body.project_id },
      select: { id: true },
    });
    if (newProject === null) {
      throw new HttpException("Project not found", 400);
    }
    // Verify employee has project membership
    const projectMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_employee_id: employee.id,
          hrm_platform_project_id: props.body.project_id,
          deleted_at: null,
        },
      });
    if (projectMembership === null) {
      throw new HttpException("You are not assigned to this project", 400);
    }
  }
  // Step 8: Validate task_id if provided
  if (props.body.task_id !== undefined) {
    const targetProjectId = props.body.project_id ?? timer.project_id;
    if (props.body.task_id !== null) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
        where: { id: props.body.task_id },
        select: { id: true, hrm_platform_projects_id: true },
      });
      if (task === null) {
        throw new HttpException("Task not found", 400);
      }
      if (task.hrm_platform_projects_id !== targetProjectId) {
        throw new HttpException(
          "Task does not belong to the selected project",
          400,
        );
      }
    }
  }
  // Step 9: Update timer
  const updatedTimer = await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.project_id !== undefined && {
        project_id: props.body.project_id,
      }),
      ...(props.body.task_id !== undefined && {
        task_id: props.body.task_id,
      }),
      updated_at: new Date(),
    },
  });
  // Step 10: Return updated timer using transformer
  const fullTimer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow(
    {
      where: { id: props.timerId },
      ...HrmPlatformTimerTransformer.select(),
    },
  );
  return await HrmPlatformTimerTransformer.transform(fullTimer);
}
