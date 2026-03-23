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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimerTransformer } from "../transformers/HrmPlatformTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimer.IUpdate;
}): Promise<IHrmPlatformTimer> {
  // 1. Find the member's employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // 2. Find the timer and verify ownership
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      hrm_platform_employee_id: employee.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_project_id: true,
      stopped_at: true,
    },
  });
  // 3. Verify timer is still running (not stopped)
  if (timer.stopped_at !== null) {
    throw new HttpException("Timer has already been stopped", 400);
  }
  // 4. Validate project assignment if provided
  let targetProjectId = timer.hrm_platform_project_id;
  if (props.body.project_id !== undefined) {
    targetProjectId = props.body.project_id;
    // Check project exists and belongs to same organization
    const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
      where: {
        id: targetProjectId,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (project === null) {
      throw new HttpException(
        "Project not found or not in your organization",
        400,
      );
    }
    // Verify employee has project membership
    const membership =
      await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
        where: {
          hrm_platform_employee_id: employee.id,
          hrm_platform_project_id: targetProjectId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (membership === null) {
      throw new HttpException("You are not a member of this project", 400);
    }
  }
  // 5. Validate task assignment if provided
  if (props.body.task_id !== undefined) {
    if (props.body.task_id !== null) {
      // Verify task exists and belongs to the target project
      const task = await MyGlobal.prisma.hrm_platform_tasks.findFirst({
        where: {
          id: props.body.task_id,
          hrm_platform_project_id: targetProjectId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (task === null) {
        throw new HttpException(
          "Task not found or does not belong to the selected project",
          400,
        );
      }
    }
  }
  // 6. Update the timer
  const updatedTimer = await MyGlobal.prisma.hrm_platform_timers.update({
    where: {
      id: props.timerId,
    },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.project_id !== undefined && {
        project: { connect: { id: props.body.project_id } },
      }),
      ...(props.body.task_id !== null &&
        props.body.task_id !== undefined && {
          task: { connect: { id: props.body.task_id } },
        }),
      ...(props.body.task_id === null && { task: { disconnect: true } }),
      updated_at: new Date(),
    },
    ...HrmPlatformTimerTransformer.select(),
  });
  // 7. Return the updated timer
  return await HrmPlatformTimerTransformer.transform(updatedTimer);
}
