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

export async function deleteHrmTimeTrackingMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        user_account_id: true,
      },
    });
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        organization_id: employee.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        timesheetTimelog: {
          select: {
            timesheet: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });
  if (timelog.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  const timesheetStatus = timelog.timesheetTimelog?.timesheet.status;
  if (timesheetStatus === "submitted" || timesheetStatus === "approved") {
    throw new HttpException(
      "Timelog cannot be deleted after submission or approval",
      409,
    );
  }
  await MyGlobal.prisma.hrm_time_tracking_timelogs.delete({
    where: {
      id: timelog.id,
    },
  });
}
