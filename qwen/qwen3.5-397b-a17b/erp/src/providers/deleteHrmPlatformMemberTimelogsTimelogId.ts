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
        employee_id: true,
        timesheet_id: true,
      },
    },
  );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: timelog.employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
        role_id: true,
      },
    });
  if (employee.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        role_id: employee.role_id,
        permission: "time:manage",
        deleted_at: null,
      },
    });
  const hasTimeManagePermission = rolePermissions.length > 0;
  if (!hasTimeManagePermission && timelog.timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
        where: {
          id: timelog.timesheet_id,
        },
        select: {
          status: true,
        },
      });
    if (timesheet.status === "submitted" || timesheet.status === "approved") {
      throw new HttpException("Forbidden", 403);
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
