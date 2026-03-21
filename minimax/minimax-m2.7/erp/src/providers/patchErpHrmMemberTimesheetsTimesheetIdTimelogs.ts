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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheetTimelog.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // 1. Fetch timesheet with employee to verify ownership
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
        },
      },
    },
  });
  // 2. Verify the requesting member owns this timesheet
  if (timesheet.employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Only draft timesheets can be modified
  if (timesheet.status !== "draft") {
    throw new HttpException(
      "Cannot modify timelogs on a non-draft timesheet",
      400,
    );
  }
  // Collect all timelog IDs to validate
  const addTimelogIds = props.body.addTimelogIds ?? [];
  const removeTimelogIds = props.body.removeTimelogIds ?? [];
  const allTimelogIds = [...addTimelogIds, ...removeTimelogIds];
  // 4. Validate all timelog IDs exist
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
    if (timelogs.length !== allTimelogIds.length) {
      const foundIds = new Set(timelogs.map((t) => t.id));
      const missingId = allTimelogIds.find((id) => !foundIds.has(id));
      throw new HttpException(`Timelog ${missingId} not found`, 404);
    }
    const timelogMap = new Map(timelogs.map((t) => [t.id, t]));
    // 5. Validate timelogs to add
    for (const timelogId of addTimelogIds) {
      const timelog = timelogMap.get(timelogId);
      if (!timelog) continue;
      // Verify employee match
      if (timelog.erp_hrm_employee_id !== timesheet.erp_hrm_employee_id) {
        throw new HttpException(
          `Timelog ${timelogId} does not belong to the timesheet owner`,
          400,
        );
      }
      // Verify date falls within timesheet week
      const timelogDate = new Date(timelog.date);
      const weekStart = new Date(timesheet.week_start_date);
      const weekEnd = new Date(timesheet.week_end_date);
      if (timelogDate < weekStart || timelogDate > weekEnd) {
        throw new HttpException(
          `Timelog ${timelogId} date is outside the timesheet week`,
          400,
        );
      }
    }
    // 6. Check existing associations to validate add/remove
    const existingAssociations =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
        where: { erp_hrm_timesheet_id: props.timesheetId },
        select: { erp_hrm_timelog_id: true },
      });
    const existingTimelogIds = new Set(
      existingAssociations.map((a) => a.erp_hrm_timelog_id),
    );
    // Validate addTimelogIds - must not already be associated
    for (const timelogId of addTimelogIds) {
      if (existingTimelogIds.has(timelogId)) {
        throw new HttpException(
          `Timelog ${timelogId} is already associated with this timesheet`,
          400,
        );
      }
    }
    // Validate removeTimelogIds - must already be associated
    for (const timelogId of removeTimelogIds) {
      if (!existingTimelogIds.has(timelogId)) {
        throw new HttpException(
          `Timelog ${timelogId} is not associated with this timesheet`,
          400,
        );
      }
    }
    // 7. Perform add operations
    for (const timelogId of addTimelogIds) {
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.create({
        data: {
          id: v4(),
          erp_hrm_timelog_id: timelogId,
          erp_hrm_timesheet_id: props.timesheetId,
          added_at: new Date(),
        },
      });
    }
    // 8. Perform remove operations
    for (const timelogId of removeTimelogIds) {
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.deleteMany({
        where: {
          erp_hrm_timelog_id: timelogId,
          erp_hrm_timesheet_id: props.timesheetId,
        },
      });
    }
  }
  // 9. Recalculate total_hours from all associated timelogs
  const associatedTimelogs =
    await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
      where: { erp_hrm_timesheet_id: props.timesheetId },
      select: { timelog: { select: { duration_minutes: true } } },
    });
  const totalMinutes = associatedTimelogs.reduce(
    (sum, tt) => sum + tt.timelog.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  // 10. Update timesheet with new total_hours and updated_at
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // 11. Return updated timesheet with full details
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
