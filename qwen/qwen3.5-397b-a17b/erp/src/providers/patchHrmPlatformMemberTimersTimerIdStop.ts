import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimersTimerIdStop(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimelog> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
  });
  if (timer.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timer.stopped_at !== null) {
    throw new HttpException("Timer is already stopped", 400);
  }
  const now = new Date();
  const startedAt = timer.started_at;
  const durationMs = now.getTime() - startedAt.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const [createdTimelog] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_platform_timelogs.create({
      data: {
        id: v4(),
        employee_id: timer.employee_id,
        project_id: timer.project_id,
        task_id: timer.task_id,
        date: startedAt,
        duration_minutes: durationMinutes < 0 ? 0 : durationMinutes,
        description: timer.description,
        billable: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.hrm_platform_timers.update({
      where: { id: props.timerId },
      data: {
        stopped_at: now,
        updated_at: now,
      },
    }),
  ]);
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: createdTimelog.id },
      ...HrmPlatformTimelogTransformer.select(),
    },
  );
  return await HrmPlatformTimelogTransformer.transform(timelog);
}
