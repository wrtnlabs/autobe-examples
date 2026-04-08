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
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      stopped_at: true,
      hrm_platform_project_id: true,
    },
  });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        id: timer.hrm_platform_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  if (timer.stopped_at !== null) {
    throw new HttpException(
      "Timer is already stopped and cannot be updated",
      400,
    );
  }
  const targetProjectId =
    props.body.hrm_platform_project_id ?? timer.hrm_platform_project_id;
  if (props.body.hrm_platform_project_id !== undefined) {
    const projectMember =
      await MyGlobal.prisma.hrm_platform_project_members.findFirstOrThrow({
        where: {
          hrm_platform_employee_id: employee.id,
          hrm_platform_project_id: props.body.hrm_platform_project_id,
        },
      });
  }
  if (props.body.hrm_platform_task_id !== undefined) {
    if (props.body.hrm_platform_task_id !== null) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
        where: {
          id: props.body.hrm_platform_task_id,
          hrm_platform_project_id: targetProjectId,
        },
      });
    }
  }
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.hrm_platform_project_id !== undefined && {
        hrm_platform_project_id: props.body.hrm_platform_project_id,
      }),
      ...(props.body.hrm_platform_task_id !== undefined && {
        hrm_platform_task_id: props.body.hrm_platform_task_id,
      }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...HrmPlatformTimerTransformer.select(),
  });
  return await HrmPlatformTimerTransformer.transform(updated);
}
