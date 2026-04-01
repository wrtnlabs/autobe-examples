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
  const submittedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        erp_hrm_time_tracking_employee_id: true,
        status: true,
        week_start_at: true,
        week_end_at: true,
        deleted_at: true,
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet is not available", 404);
  }
  if (timesheet.erp_hrm_time_tracking_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Only draft timesheets can be submitted", 400);
  }
  const member = await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirst({
    where: { id: props.member.id, deleted_at: null },
    select: { id: true },
  });
  if (member === null) {
    throw new HttpException(
      "Deactivated employees cannot submit timesheets",
      403,
    );
  }
  const timelogCount =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.count({
      where: {
        erp_hrm_time_tracking_timesheet_id: props.timesheetId,
        deleted_at: null,
      },
    });
  if (timelogCount === 0) {
    throw new HttpException("Submission requires at least one timelog", 400);
  }
  const hasConflict =
    await MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findFirst({
      where: {
        id: { not: props.timesheetId },
        erp_hrm_time_tracking_employee_id: props.member.id,
        week_start_at: timesheet.week_start_at,
        week_end_at: timesheet.week_end_at,
        deleted_at: null,
        status: { in: ["submitted", "approved"] },
      },
      select: { id: true },
    });
  if (hasConflict !== null) {
    throw new HttpException(
      "A submitted or approved timesheet already exists for this week",
      400,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const latest = await tx.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        erp_hrm_time_tracking_employee_id: true,
        status: true,
        week_start_at: true,
        week_end_at: true,
        deleted_at: true,
      },
    });
    if (latest.deleted_at !== null) {
      throw new HttpException("Timesheet is not available", 404);
    }
    if (latest.erp_hrm_time_tracking_employee_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (latest.status !== "draft") {
      throw new HttpException("Only draft timesheets can be submitted", 400);
    }
    const lockedTimelogCount = await tx.erp_hrm_time_tracking_timelogs.count({
      where: {
        erp_hrm_time_tracking_timesheet_id: props.timesheetId,
        deleted_at: null,
      },
    });
    if (lockedTimelogCount === 0) {
      throw new HttpException("Submission requires at least one timelog", 400);
    }
    const conflictInsideTx =
      await tx.erp_hrm_time_tracking_timesheets.findFirst({
        where: {
          id: { not: props.timesheetId },
          erp_hrm_time_tracking_employee_id: props.member.id,
          week_start_at: latest.week_start_at,
          week_end_at: latest.week_end_at,
          deleted_at: null,
          status: { in: ["submitted", "approved"] },
        },
        select: { id: true },
      });
    if (conflictInsideTx !== null) {
      throw new HttpException(
        "A submitted or approved timesheet already exists for this week",
        400,
      );
    }
    await tx.erp_hrm_time_tracking_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "submitted",
        submitted_at: submittedAt,
      },
    });
    return await tx.erp_hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimeTrackingTimesheetTransformer.select(),
    });
  });
  return await ErpHrmTimeTrackingTimesheetTransformer.transform(updated);
}
