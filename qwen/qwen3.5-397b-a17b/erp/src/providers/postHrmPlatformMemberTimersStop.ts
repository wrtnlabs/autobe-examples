import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function postHrmPlatformMemberTimersStop(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformTimelog> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUnique({
    where: {
      employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (!timer) {
    throw new HttpException("No active timer found", 404);
  }
  const now = new Date();
  const durationMs = now.getTime() - timer.started_at.getTime();
  let durationMinutes = Math.round(durationMs / 60000);
  if (durationMinutes < 1) {
    durationMinutes = 1;
  }
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: {
      id: v4(),
      employee_id: employee.id,
      project_id: timer.project_id,
      task_id: timer.task_id,
      date: now,
      duration_minutes: durationMinutes,
      description: timer.description,
      billable: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...HrmPlatformTimelogTransformer.select(),
  });
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: {
      id: timer.id,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  return await HrmPlatformTimelogTransformer.transform(timelog);
}
