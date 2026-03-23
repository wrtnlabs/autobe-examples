import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the timer record
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      deleted_at: true,
    },
  } satisfies Prisma.hrm_platform_timersFindUniqueArgs);
  // Check if already deleted
  if (timer.deleted_at !== null) {
    throw new HttpException("Gone", 410);
  }
  // Verify ownership by checking employee's member_id and get organization_id
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timer.hrm_platform_employee_id },
      select: { member_id: true, organization_id: true },
    } satisfies Prisma.hrm_platform_employeesFindUniqueArgs);
  if (employee.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the timer
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  } satisfies Prisma.hrm_platform_timersUpdateArgs);
  // Record activity log
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_organization_id: employee.organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "timer_deleted",
      target_entity_type: "timer",
      target_entity_id: props.timerId,
      action_description: `Timer ${props.timerId} was deleted`,
      created_at: new Date(),
    },
  } satisfies Prisma.hrm_platform_activity_logsCreateArgs);
}
