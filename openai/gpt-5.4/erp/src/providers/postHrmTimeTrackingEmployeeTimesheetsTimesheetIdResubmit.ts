import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimesheetsTimesheetIdResubmit(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingTimesheet> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.employee.id,
        deleted_at: null,
        sessions: {
          some: {
            id: props.employee.session_id,
            logged_out_at: null,
            expired_at: {
              gt: new Date(),
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const timesheet =
      await prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
        where: {
          id: props.timesheetId,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          week_start_date: true,
          status: true,
          rejection_reason: true,
        },
      });
    if (timesheet.hrm_time_tracking_employee_id !== employee.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (timesheet.status !== "draft" || timesheet.rejection_reason === null) {
      throw new HttpException(
        "Only rejected draft timesheets can be resubmitted",
        400,
      );
    }
    const included =
      await prisma.hrm_time_tracking_timesheet_timelogs.findFirst({
        where: {
          hrm_time_tracking_timesheet_id: timesheet.id,
          deleted_at: null,
          timelog: {
            deleted_at: null,
          },
        },
        select: {
          id: true,
        },
      });
    if (included === null) {
      throw new HttpException("Cannot submit an empty timesheet", 400);
    }
    const duplicate = await prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: {
          not: timesheet.id,
        },
        deleted_at: null,
        hrm_time_tracking_employee_id: timesheet.hrm_time_tracking_employee_id,
        week_start_date: timesheet.week_start_date,
        status: {
          in: ["submitted", "approved"],
        },
      },
      select: {
        id: true,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Another submitted or approved timesheet already exists for this week",
        400,
      );
    }
    const updated = await prisma.hrm_time_tracking_timesheets.updateMany({
      where: {
        id: timesheet.id,
        deleted_at: null,
        hrm_time_tracking_employee_id: employee.id,
        status: "draft",
        rejection_reason: {
          not: null,
        },
      },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        reviewed_at: null,
        rejection_reason: null,
        updated_at: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new HttpException("Timesheet resubmission conflict", 409);
    }
    const result = await prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
      where: {
        id: timesheet.id,
        deleted_at: null,
        hrm_time_tracking_employee_id: employee.id,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
    return await HrmTimeTrackingTimesheetTransformer.transform(result);
  });
}
