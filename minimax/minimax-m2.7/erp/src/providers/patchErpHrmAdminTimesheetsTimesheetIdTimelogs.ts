import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminTimesheetsTimesheetIdTimelogs(props: {
  admin: AdminPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheetTimelog.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // Step 1: Fetch the timesheet and verify it exists and is in draft status
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      total_hours: true,
    },
  });
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be modified", 400);
  }
  // Step 2: Collect all timelog IDs to validate
  const allTimelogIds = [
    ...(props.body.addTimelogIds ?? []),
    ...(props.body.removeTimelogIds ?? []),
  ];
  if (allTimelogIds.length > 0) {
    const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
      where: { id: { in: allTimelogIds } },
      select: {
        id: true,
        erp_hrm_employee_id: true,
        date: true,
        duration_minutes: true,
      },
    });
    const foundIds = new Set(timelogs.map((t) => t.id));
    const missingIds = allTimelogIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new HttpException(
        `Timelog(s) not found: ${missingIds.join(", ")}`,
        400,
      );
    }
    // Step 3: Process addTimelogIds
    if (props.body.addTimelogIds && props.body.addTimelogIds.length > 0) {
      const existingAssociations =
        await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
          where: {
            erp_hrm_timesheet_id: props.timesheetId,
            erp_hrm_timelog_id: { in: props.body.addTimelogIds },
          },
          select: { erp_hrm_timelog_id: true },
        });
      const alreadyAssociated = new Set(
        existingAssociations.map((a) => a.erp_hrm_timelog_id),
      );
      const toAdd = props.body.addTimelogIds.filter(
        (id) => !alreadyAssociated.has(id),
      );
      const alreadyAdded = props.body.addTimelogIds.filter((id) =>
        alreadyAssociated.has(id),
      );
      if (toAdd.length > 0) {
        for (const timelogId of toAdd) {
          const timelog = timelogs.find((t) => t.id === timelogId)!;
          // Validate: timelog employee must match timesheet owner
          if (timelog.erp_hrm_employee_id !== timesheet.erp_hrm_employee_id) {
            throw new HttpException(
              `Timelog ${timelogId} does not belong to the timesheet owner`,
              400,
            );
          }
          // Validate: timelog date must fall within timesheet week
          const timelogDate = timelog.date.getTime();
          const weekStart = timesheet.week_start_date.getTime();
          const weekEnd = timesheet.week_end_date.getTime();
          if (timelogDate < weekStart || timelogDate > weekEnd) {
            throw new HttpException(
              `Timelog ${timelogId} date is outside the timesheet week (${new Date(weekStart).toISOString()} to ${new Date(weekEnd).toISOString()})`,
              400,
            );
          }
          // Insert junction record
          await MyGlobal.prisma.erp_hrm_timesheet_timelogs.create({
            data: {
              id: v4(),
              erp_hrm_timesheet_id: props.timesheetId,
              erp_hrm_timelog_id: timelogId,
              added_at: new Date(),
            },
          });
        }
      }
      if (alreadyAdded.length > 0) {
        throw new HttpException(
          `Timelog(s) already associated: ${alreadyAdded.join(", ")}`,
          400,
        );
      }
    }
    // Step 4: Process removeTimelogIds
    if (props.body.removeTimelogIds && props.body.removeTimelogIds.length > 0) {
      const existingAssociations =
        await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
          where: {
            erp_hrm_timesheet_id: props.timesheetId,
            erp_hrm_timelog_id: { in: props.body.removeTimelogIds },
          },
          select: { id: true, erp_hrm_timelog_id: true },
        });
      const associatedIds = new Set(
        existingAssociations.map((a) => a.erp_hrm_timelog_id),
      );
      const notAssociated = props.body.removeTimelogIds.filter(
        (id) => !associatedIds.has(id),
      );
      if (notAssociated.length > 0) {
        throw new HttpException(
          `Timelog(s) not currently associated with this timesheet: ${notAssociated.join(", ")}`,
          400,
        );
      }
      // Delete junction records
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.deleteMany({
        where: {
          erp_hrm_timesheet_id: props.timesheetId,
          erp_hrm_timelog_id: { in: props.body.removeTimelogIds },
        },
      });
    }
  }
  // Step 5: Recalculate total_hours from all currently associated timelogs
  const associatedTimelogs =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
      where: { erp_hrm_timesheet_id: props.timesheetId },
      select: {
        timelog: {
          select: { duration_minutes: true },
        },
      },
    });
  const totalMinutes = associatedTimelogs.reduce(
    (sum, item) => sum + item.timelog.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  // Step 6: Update timesheet with new total_hours and updated_at
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // Step 7: Fetch and return updated timesheet with all relations
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return await ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
