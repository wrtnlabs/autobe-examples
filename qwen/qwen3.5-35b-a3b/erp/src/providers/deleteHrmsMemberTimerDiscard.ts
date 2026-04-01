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

export async function deleteHrmsMemberTimerDiscard(props: {
  member: MemberPayload;
}): Promise<void> {
  // Step 1: Find the organization member record for this member
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Not an employee", 403);
  }
  // Step 2: Find the employee record linked to this organization member
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Not an employee", 403);
  }
  // Step 3: Find active timer for this employee
  const timer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      hrms_employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (timer === null) {
    throw new HttpException("No active timer found", 404);
  }
  // Step 4: Delete the timer (discard without creating timelog)
  await MyGlobal.prisma.hrms_timers.delete({
    where: {
      id: timer.id,
    },
  });
}
