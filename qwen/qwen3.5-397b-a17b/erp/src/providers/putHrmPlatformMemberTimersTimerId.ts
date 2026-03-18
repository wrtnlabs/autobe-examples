import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
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
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      employee_id: true,
      stopped_at: true,
      project_id: true,
    },
  });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timer.stopped_at !== null) {
    throw new HttpException("Timer is already stopped", 400);
  }
  const targetProjectId = props.body.project_id ?? timer.project_id;
  if (props.body.project_id !== undefined) {
    await MyGlobal.prisma.hrm_platform_project_members.findFirstOrThrow({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.body.project_id,
        deleted_at: null,
      },
    });
  }
  if (props.body.task_id !== undefined) {
    if (props.body.task_id === null) {
      // Explicitly unsetting task
    } else {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
        where: { id: props.body.task_id },
        select: { id: true, hrm_platform_project_id: true },
      });
      if (task.hrm_platform_project_id !== targetProjectId) {
        throw new HttpException(
          "Task does not belong to the selected project",
          400,
        );
      }
    }
  }
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.project_id !== undefined && {
        project_id: props.body.project_id,
      }),
      ...(props.body.task_id !== undefined && { task_id: props.body.task_id }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(updated);
}
