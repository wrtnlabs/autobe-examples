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

export async function deleteHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        employee: {
          select: {
            id: true,
            user_id: true,
            role: {
              select: {
                rolePermissions: {
                  where: { deleted_at: null },
                  select: { permission: true },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.hrm_platform_timesheetsFindUniqueOrThrowArgs);
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Cannot delete timesheet that is not in draft status",
      400,
    );
  }
  const isOwner = timesheet.employee.user_id === props.member.id;
  if (!isOwner) {
    const hasManagePermission = timesheet.employee.role.rolePermissions.some(
      (rp) => rp.permission === "time:manage",
    );
    if (!hasManagePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: { deleted_at: new Date() },
  });
}
