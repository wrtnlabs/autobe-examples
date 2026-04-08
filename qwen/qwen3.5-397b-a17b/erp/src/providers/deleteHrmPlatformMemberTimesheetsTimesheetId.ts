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
      where: { id: props.timesheetId, deleted_at: null },
      select: {
        id: true,
        employee_id: true,
        status: true,
        employee: {
          select: {
            id: true,
            member_id: true,
            role: {
              select: {
                id: true,
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
        },
      },
    });
  const isOwner = timesheet.employee.member_id === props.member.id;
  const hasTimeManage = timesheet.employee.role.rolePermissions.some(
    (rp) => rp.permission.code === "time:manage",
  );
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status === "approved") {
    throw new HttpException(
      "Approved timesheets are locked and cannot be deleted",
      400,
    );
  }
  if (
    !hasTimeManage &&
    timesheet.status !== "draft" &&
    timesheet.status !== "rejected"
  ) {
    throw new HttpException(
      "Only draft and rejected timesheets can be deleted",
      400,
    );
  }
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
    },
  });
}
