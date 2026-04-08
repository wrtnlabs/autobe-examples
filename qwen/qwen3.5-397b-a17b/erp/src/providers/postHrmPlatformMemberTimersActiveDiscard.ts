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

export async function postHrmPlatformMemberTimersActiveDiscard(props: {
  member: MemberPayload;
}): Promise<void> {
  // Find the employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check if employee is deactivated
  if (employee.status === "deactivated") {
    throw new HttpException(
      "Deactivated employees cannot perform timer operations",
      403,
    );
  }
  // Find the active timer for this employee
  const activeTimer = await MyGlobal.prisma.hrm_platform_timers.findFirst({
    where: {
      hrm_platform_employee_id: employee.id,
      stopped_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!activeTimer) {
    throw new HttpException("No active timer found", 404);
  }
  // Delete the timer without creating a timelog
  await MyGlobal.prisma.hrm_platform_timers.delete({
    where: {
      id: activeTimer.id,
    },
  });
}
