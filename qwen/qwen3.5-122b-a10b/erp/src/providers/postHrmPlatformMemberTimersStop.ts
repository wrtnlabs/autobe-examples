import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
  // Find the employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Find active timer for this employee
  const timer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      employee_id: employee.id,
      stopped_at: null,
      deleted_at: null,
    },
  });
  if (timer === null) {
    throw new HttpException("No active timer found", 404);
  }
  // Calculate duration in minutes (rounded to nearest integer)
  const now = new Date();
  const startedAt = timer.started_at;
  const durationMs = now.getTime() - startedAt.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  // Create timelog
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_employee_id: employee.id,
      hrm_platform_project_id: timer.project_id,
      hrm_platform_task_id: timer.task_id,
      date: toISOStringSafe(now),
      duration_minutes: durationMinutes,
      description: timer.description,
      billable: true,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
    ...HrmPlatformTimelogTransformer.select(),
  });
  // Update timer to mark as stopped
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: timer.id },
    data: {
      stopped_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });
  // Transform and return
  return await HrmPlatformTimelogTransformer.transform(timelog);
}
