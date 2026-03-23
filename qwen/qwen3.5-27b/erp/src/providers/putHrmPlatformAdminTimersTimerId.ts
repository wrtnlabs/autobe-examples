import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminTimersTimerId(props: {
  admin: AdminPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimer.IUpdate;
}): Promise<IHrmPlatformTimer> {
  // Find the timer (must exist and not be deleted)
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      stopped_at: true,
    },
  });
  // Verify timer is still running (not stopped)
  if (timer.stopped_at !== null) {
    throw new HttpException("Timer has already been stopped", 400);
  }
  // Determine the target project ID (new if provided, otherwise current)
  const targetProjectId =
    props.body.project_id ?? timer.hrm_platform_project_id;
  // If project is being changed, validate project membership
  if (props.body.project_id !== undefined) {
    const newProject =
      await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
        where: {
          id: props.body.project_id,
          deleted_at: null,
        },
        select: {
          id: true,
          organization_id: true,
        },
      });
    // Get the employee to verify organization match
    const employee =
      await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
        where: {
          id: timer.hrm_platform_employee_id,
          deleted_at: null,
        },
        select: {
          id: true,
          organization_id: true,
        },
      });
    // Verify project belongs to same organization as employee
    if (newProject.organization_id !== employee.organization_id) {
      throw new HttpException(
        "Project does not belong to the employee's organization",
        400,
      );
    }
    // Verify employee has project membership
    const projectMembership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: timer.hrm_platform_employee_id,
          hrm_platform_project_id: props.body.project_id,
          deleted_at: null,
        },
      });
    if (projectMembership === null) {
      throw new HttpException(
        "Employee is not a member of the specified project",
        400,
      );
    }
  }
  // If task is being changed, validate task belongs to the target project
  if (props.body.task_id !== undefined) {
    if (props.body.task_id !== null) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: {
          id: props.body.task_id,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_platform_project_id: true,
        },
      });
      // Verify task belongs to the target project
      if (task.hrm_platform_project_id !== targetProjectId) {
        throw new HttpException(
          "Task does not belong to the specified project",
          400,
        );
      }
    }
  }
  // Build update data
  const updateData: Prisma.hrm_platform_timersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.project_id !== undefined) {
    updateData.project = { connect: { id: props.body.project_id } };
  }
  if (props.body.task_id !== undefined) {
    updateData.task =
      props.body.task_id === null
        ? { disconnect: true }
        : { connect: { id: props.body.task_id } };
  }
  // Update the timer
  const updatedTimer = await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: updateData,
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(updatedTimer);
}
