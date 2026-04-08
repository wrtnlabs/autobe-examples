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

export async function deleteHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_timesheet_id: true,
      },
    },
  );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: timelog.hrm_platform_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        role: {
          select: {
            id: true,
            organization_id: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  const isOwner = employee.member_id === props.member.id;
  const hasTimeManage = employee.role.rolePermissions.some(
    (rp) => rp.permission.code === "time:manage",
  );
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (!hasTimeManage && timelog.hrm_platform_timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
        where: {
          id: timelog.hrm_platform_timesheet_id,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
        },
      });
    if (timesheet.status === "submitted" || timesheet.status === "approved") {
      throw new HttpException("Conflict", 409);
    }
  }
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
