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

export async function deleteHrmTimeTrackMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_time_track_employee_id: true,
        status: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            hrm_time_track_member_id: true,
            hrm_time_track_role_id: true,
            role: {
              select: {
                id: true,
                permissions: {
                  select: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet already deleted", 404);
  }
  if (
    timesheet.employee.role === null ||
    timesheet.employee.role === undefined
  ) {
    throw new HttpException("Employee role not found", 404);
  }
  const hasTimeManagementPermission = timesheet.employee.role.permissions.some(
    (p) => p.permission === "time_management",
  );
  const isOwner =
    timesheet.employee.hrm_time_track_member_id === props.member.id;
  const isDraft = timesheet.status === "draft";
  if (!hasTimeManagementPermission && (!isOwner || !isDraft)) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_track_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: new Date(),
    },
  });
}
