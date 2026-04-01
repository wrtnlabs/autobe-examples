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

export async function deleteHrmsMemberTimer(props: {
  member: MemberPayload;
}): Promise<void> {
  // 1. Retrieve the authenticated employee ID from the request context (JWT session)
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organizationMember: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const employeeId: string & tags.Format<"uuid"> =
    employee.id satisfies string & tags.Format<"uuid">;
  // 2. Query hrms_timers table for an active timer where hrms_employee_id matches the authenticated employee AND deleted_at is NULL
  const activeTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      hrms_employee_id: employeeId,
      deleted_at: null,
    },
  });
  // 3. If no active timer is found, return 404 Not Found
  if (activeTimer === null) {
    throw new HttpException("No active timer found", 404);
  }
  // 4. Perform soft deletion by setting deleted_at to the current timestamp
  //    and updated_at to track the modification
  await MyGlobal.prisma.hrms_timers.update({
    where: {
      id: activeTimer.id,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
