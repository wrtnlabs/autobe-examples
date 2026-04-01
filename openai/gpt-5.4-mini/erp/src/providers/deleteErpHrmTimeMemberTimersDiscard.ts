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

export async function deleteErpHrmTimeMemberTimersDiscard(props: {
  member: MemberPayload;
}): Promise<void> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
          erp_hrm_time_member_id: true,
        },
      },
    );
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        erp_hrm_time_member_id: membership.erp_hrm_time_member_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  const timer = await MyGlobal.prisma.erp_hrm_time_timers.findFirst({
    where: {
      employee_id: employee.id,
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      member_id: true,
    },
  });
  if (timer === null) {
    throw new HttpException("Active timer not found", 404);
  }
  if (
    timer.member_id !== props.member.id ||
    timer.employee_id !== employee.id
  ) {
    throw new HttpException("Active timer not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_timers.delete({
      where: {
        id: timer.id,
      },
    });
  });
}
