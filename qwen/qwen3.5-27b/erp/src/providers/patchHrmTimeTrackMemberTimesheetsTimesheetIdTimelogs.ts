import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimesheetTransformer } from "../transformers/HrmTimeTrackTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTimesheet.ITimelogUpdate;
}): Promise<IHrmTimeTrackTimesheet> {
  // Step 1: Find the timesheet and verify it exists and is in draft status
  const timesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      ...HrmTimeTrackTimesheetTransformer.select(),
    });
  // Verify timesheet is in draft status
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Timesheet must be in draft status to modify timelogs",
      400,
    );
  }
  // Step 2: Verify the authenticated member owns the timesheet
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found for this member", 404);
  }
  if (timesheet.employee?.id !== employee.id) {
    throw new HttpException("You do not own this timesheet", 403);
  }
  const employeeId = employee.id;
  // Step 3: Process timelog additions
  if (props.body.add && props.body.add.length > 0) {
    for (const timelogId of props.body.add) {
      // Find the timelog and validate it
      const timelog = await MyGlobal.prisma.hrm_time_track_timelogs.findUnique({
        where: {
          id: timelogId,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_track_employee_id: true,
          date: true,
        },
      });
      if (!timelog) {
        throw new HttpException(
          `Timelog ${timelogId} not found or deleted`,
          404,
        );
      }
      // Verify timelog belongs to the same employee
      if (timelog.hrm_time_track_employee_id !== employeeId) {
        throw new HttpException(
          `Timelog ${timelogId} does not belong to you`,
          403,
        );
      }
      // Verify timelog date is within the timesheet's week range
      const timelogDate = timelog.date;
      const weekStart = timesheet.week_start_date;
      const weekEnd = timesheet.week_end_date;
      if (timelogDate < weekStart || timelogDate > weekEnd) {
        throw new HttpException(
          `Timelog ${timelogId} date is outside the timesheet week range`,
          400,
        );
      }
      // Check if already associated (skip if exists)
      const existingAssociation =
        await MyGlobal.prisma.hrm_time_track_timesheet_timelogs.findFirst({
          where: {
            hrm_time_track_timesheet_id: props.timesheetId,
            hrm_time_track_timelog_id: timelogId,
          },
        });
      if (!existingAssociation) {
        // Create new association
        await MyGlobal.prisma.hrm_time_track_timesheet_timelogs.create({
          data: {
            id: v4(),
            hrm_time_track_timesheet_id: props.timesheetId,
            hrm_time_track_timelog_id: timelogId,
            created_at: new Date(),
          },
        });
      }
    }
  }
  // Step 4: Process timelog removals
  if (props.body.remove && props.body.remove.length > 0) {
    for (const timelogId of props.body.remove) {
      // Find and delete the association
      const deleted =
        await MyGlobal.prisma.hrm_time_track_timesheet_timelogs.deleteMany({
          where: {
            hrm_time_track_timesheet_id: props.timesheetId,
            hrm_time_track_timelog_id: timelogId,
          },
        });
      if (deleted.count === 0) {
        throw new HttpException(
          `Timelog ${timelogId} is not associated with this timesheet`,
          404,
        );
      }
    }
  }
  // Step 5: Update the timesheet's updated_at timestamp
  await MyGlobal.prisma.hrm_time_track_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      updated_at: new Date(),
    },
  });
  // Step 6: Fetch and return the updated timesheet
  const updatedTimesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmTimeTrackTimesheetTransformer.select(),
    });
  return await HrmTimeTrackTimesheetTransformer.transform(updatedTimesheet);
}
