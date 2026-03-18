import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingEmployeeTimelogsTimelogId(props: {
  employee: EmployeePayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timelog =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        timesheetTimelog: {
          select: {
            id: true,
            deleted_at: true,
            timesheet: {
              select: {
                id: true,
                status: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  if (timelog.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    timelog.timesheetTimelog !== null &&
    timelog.timesheetTimelog.deleted_at === null &&
    timelog.timesheetTimelog.timesheet.deleted_at === null &&
    (timelog.timesheetTimelog.timesheet.status === "submitted" ||
      timelog.timesheetTimelog.timesheet.status === "approved")
  ) {
    throw new HttpException(
      "Timelog cannot be deleted while included in a submitted or approved timesheet.",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_timelogs.delete({
      where: {
        id: timelog.id,
      },
    });
  });
}
