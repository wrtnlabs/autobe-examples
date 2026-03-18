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

export async function putHrmTimeTrackingEmployeeTimesheetsTimesheetId(props: {
  employee: EmployeePayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.IUpdate;
}): Promise<IHrmTimeTrackingTimesheet> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const timesheet =
      await prisma.hrm_time_tracking_timesheets.findFirstOrThrow({
        where: {
          id: props.timesheetId,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          hrm_time_tracking_employee_id: true,
          week_start_date: true,
          status: true,
        },
      });
    if (timesheet.hrm_time_tracking_employee_id !== props.employee.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (timesheet.status === "approved") {
      throw new HttpException("Approved timesheets cannot be modified", 400);
    }
    if (
      !(timesheet.status === "draft" && props.body.status === "submitted") &&
      !(timesheet.status === "submitted" && props.body.status === "approved") &&
      !(timesheet.status === "submitted" && props.body.status === "rejected") &&
      !(timesheet.status === "rejected" && props.body.status === "submitted")
    ) {
      throw new HttpException("Invalid timesheet status transition", 400);
    }
    if (
      props.body.status === "submitted" &&
      (timesheet.status === "draft" || timesheet.status === "rejected")
    ) {
      const inclusionCount =
        await prisma.hrm_time_tracking_timesheet_timelogs.count({
          where: {
            hrm_time_tracking_timesheet_id: props.timesheetId,
            deleted_at: null,
            timelog: {
              deleted_at: null,
            },
          },
        });
      if (inclusionCount === 0) {
        throw new HttpException(
          "Timesheet cannot be submitted without timelogs",
          400,
        );
      }
      const conflicting = await prisma.hrm_time_tracking_timesheets.findFirst({
        where: {
          deleted_at: null,
          hrm_time_tracking_employee_id:
            timesheet.hrm_time_tracking_employee_id,
          week_start_date: timesheet.week_start_date,
          status: {
            in: ["submitted", "approved"],
          },
          id: {
            not: props.timesheetId,
          },
        },
        select: {
          id: true,
        },
      });
      if (conflicting !== null) {
        throw new HttpException(
          "Another timesheet for this week is already submitted or approved",
          400,
        );
      }
      const now = new Date().toISOString();
      await prisma.hrm_time_tracking_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "submitted",
          submitted_at: now,
          reviewed_at: null,
          rejection_reason: null,
          updated_at: now,
        },
      });
    } else if (
      timesheet.status === "submitted" &&
      props.body.status === "approved"
    ) {
      const inclusions =
        await prisma.hrm_time_tracking_timesheet_timelogs.findMany({
          where: {
            hrm_time_tracking_timesheet_id: props.timesheetId,
            deleted_at: null,
            timelog: {
              deleted_at: null,
            },
          },
          select: {
            id: true,
            timelog: {
              select: {
                id: true,
              },
            },
          },
        });
      if (inclusions.length === 0) {
        throw new HttpException(
          "Submitted timesheet has no timelogs to approve",
          400,
        );
      }
      const now = new Date().toISOString();
      await prisma.hrm_time_tracking_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "approved",
          reviewed_at: now,
          rejection_reason: null,
          updated_at: now,
        },
      });
    } else {
      if ((props.body.rejection_reason ?? null) === null) {
        throw new HttpException("Rejection reason is required", 400);
      }
      const now = new Date().toISOString();
      await prisma.hrm_time_tracking_timesheets.update({
        where: { id: props.timesheetId },
        data: {
          status: "rejected",
          reviewed_at: now,
          rejection_reason: props.body.rejection_reason,
          updated_at: now,
        },
      });
    }
    return await prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  });
  return await HrmTimeTrackingTimesheetTransformer.transform(updated);
}
