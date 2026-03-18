import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimesheetTransformer } from "../transformers/ErpHrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingTimesheet> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const timesheet =
      await tx.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
        where: { id: props.timesheetId },
        select: {
          id: true,
          erp_hrm_time_tracking_organization_id: true,
          erp_hrm_time_tracking_employee_id: true,
          week_start_at: true,
          week_end_at: true,
          status: true,
        },
      });
    if (timesheet.erp_hrm_time_tracking_employee_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const member = await tx.erp_hrm_time_tracking_members.findUnique({
      where: { id: props.member.id },
      select: { id: true, deleted_at: true },
    });
    if (!member || member.deleted_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
    if (timesheet.status !== "draft") {
      throw new HttpException("Invalid timesheet status", 400);
    }
    const timelogCount = await tx.erp_hrm_time_tracking_timelogs.count({
      where: {
        erp_hrm_time_tracking_timesheet_id: timesheet.id,
        deleted_at: null,
      },
    });
    if (timelogCount === 0) {
      throw new HttpException("Submission requires at least one timelog", 400);
    }
    const conflict = await tx.erp_hrm_time_tracking_timesheets.findFirst({
      where: {
        id: { not: timesheet.id },
        erp_hrm_time_tracking_employee_id:
          timesheet.erp_hrm_time_tracking_employee_id,
        week_start_at: timesheet.week_start_at,
        week_end_at: timesheet.week_end_at,
        status: { in: ["submitted", "approved"] },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (conflict) {
      throw new HttpException(
        "Timesheet for this week already submitted or approved",
        400,
      );
    }
    await tx.erp_hrm_time_tracking_timesheets.update({
      where: { id: timesheet.id },
      data: {
        status: "submitted",
        submitted_at: new Date(),
      },
    });
    const updated = await tx.erp_hrm_time_tracking_timesheets.findUniqueOrThrow(
      {
        where: { id: timesheet.id },
        ...ErpHrmTimeTrackingTimesheetTransformer.select(),
      },
    );
    return await ErpHrmTimeTrackingTimesheetTransformer.transform(updated);
  });
}
