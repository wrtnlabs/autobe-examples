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

export async function postHrmPlatformMemberTimersActiveStop(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformTimelog> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const timer = await MyGlobal.prisma.hrm_platform_timers.findFirstOrThrow({
    where: {
      hrm_platform_employee_id: employee.id,
      stopped_at: null,
    },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      started_at: true,
      description: true,
    },
  });
  const now = new Date();
  const durationMinutes = Math.round(
    (now.getTime() - timer.started_at.getTime()) / 60000,
  );
  const dateAtMidnight = new Date(
    Date.UTC(
      timer.started_at.getUTCFullYear(),
      timer.started_at.getUTCMonth(),
      timer.started_at.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const created = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: {
      id: v4(),
      hrm_platform_employee_id: timer.hrm_platform_employee_id,
      hrm_platform_project_id: timer.hrm_platform_project_id,
      hrm_platform_task_id: timer.hrm_platform_task_id,
      description: timer.description,
      duration_minutes: durationMinutes,
      date: dateAtMidnight,
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
      stopped_at: now,
      updated_at: now,
    },
  });
  return await HrmPlatformTimelogTransformer.transform(created);
}
