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
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
    },
  });
  if (timer.erp_hrm_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.member.id },
    select: {
      id: true,
      status: true,
    },
  });
  if (employee.status === "deactivated") {
    throw new HttpException("Employee account is deactivated", 400);
  }
  await MyGlobal.prisma.erp_hrm_timers.delete({
    where: { id: props.timerId },
  });
}
