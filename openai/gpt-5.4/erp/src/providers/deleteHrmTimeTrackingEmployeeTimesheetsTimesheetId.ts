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

export async function deleteHrmTimeTrackingEmployeeTimesheetsTimesheetId(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
        employee: {
          id: props.employee.id,
          deleted_at: null,
          sessions: {
            some: {
              id: props.employee.session_id,
              logged_out_at: null,
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (timesheet.status === "submitted") {
    throw new HttpException("Submitted timesheets cannot be deleted.", 400);
  }
  if (timesheet.status === "approved") {
    throw new HttpException("Approved timesheets cannot be deleted.", 400);
  }
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Invalid workflow state for deletion.", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_timesheets.delete({
      where: {
        id: timesheet.id,
      },
    });
  });
}
