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
  // Step 1: Get the organization member record (active membership)
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Get the employee linked to this organization member
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Find the active timer for this employee
  // Only one active timer allowed per employee (unique constraint on hrms_employee_id)
  const activeTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      hrms_employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (activeTimer === null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Delete the timer without creating any timelog
  // This is irreversible and leaves no audit trail
  await MyGlobal.prisma.hrms_timers.delete({
    where: {
      id: activeTimer.id,
    },
  });
}
