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

export async function deleteErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the timer and verify it's active
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      deleted_at: true,
    },
  });
  // Check if timer is still active (not already stopped/discarded)
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer not found", 404);
  }
  // Step 2: Find the employee record for the member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify ownership - only the employee who owns the timer can discard it
  if (timer.erp_hrm_employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Verify employee is active
  if (employee.status !== "active") {
    throw new HttpException(
      "Deactivated employees cannot perform timer operations",
      403,
    );
  }
  // Step 5: Hard delete the timer (discard without creating timelog)
  await MyGlobal.prisma.erp_hrm_timers.delete({
    where: { id: props.timerId },
  });
}
