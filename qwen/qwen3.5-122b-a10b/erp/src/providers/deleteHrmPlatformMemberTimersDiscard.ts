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

export async function deleteHrmPlatformMemberTimersDiscard(props: {
  member: MemberPayload;
}): Promise<void> {
  // Find the employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Find active timer (stopped_at is null, deleted_at is null)
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
  // Soft delete the timer by setting deleted_at
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: timer.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Note: Notification to time:view_all users should be triggered here
  // but is typically handled by event/emitter system outside this function
}
