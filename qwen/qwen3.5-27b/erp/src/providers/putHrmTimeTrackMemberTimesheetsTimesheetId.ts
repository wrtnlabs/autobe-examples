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

export async function putHrmTimeTrackMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTimesheet.IUpdate;
}): Promise<IHrmTimeTrackTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        week_start_date: true,
        hrm_time_track_employee_id: true,
        timelogs: {
          select: { id: true },
        },
      },
    });
  const isEmployeeOwner =
    timesheet.hrm_time_track_employee_id === props.member.id;
  if (!isEmployeeOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const currentStatus = timesheet.status;
  const newStatus = props.body.status;
  if (newStatus === undefined) {
    throw new HttpException("Status is required", 400);
  }
  if (currentStatus === "approved") {
    throw new HttpException("Approved timesheets cannot be modified", 400);
  }
  let updateData: Prisma.hrm_time_track_timesheetsUpdateInput;
  if (newStatus === "submitted") {
    if (timesheet.timelogs.length === 0) {
      throw new HttpException("Cannot submit timesheet with no timelogs", 400);
    }
    const existingTimesheet =
      await MyGlobal.prisma.hrm_time_track_timesheets.findFirst({
        where: {
          id: {
            not: props.timesheetId,
          },
          hrm_time_track_employee_id: timesheet.hrm_time_track_employee_id,
          week_start_date: timesheet.week_start_date,
          status: {
            in: ["submitted", "approved"],
          },
          deleted_at: null,
        },
      });
    if (existingTimesheet !== null) {
      throw new HttpException(
        "Cannot submit: another timesheet for this week already exists",
        400,
      );
    }
    updateData = {
      status: "submitted",
    };
  } else if (newStatus === "draft") {
    if (currentStatus !== "rejected") {
      throw new HttpException(
        "Can only change to draft from rejected status",
        400,
      );
    }
    updateData = {
      status: "draft",
      rejected_at: null,
      rejection_reason: null,
    };
  } else if (newStatus === "approved" || newStatus === "rejected") {
    throw new HttpException(
      "Only employee can submit timesheets, approval and rejection require time management permission",
      403,
    );
  } else {
    throw new HttpException("Invalid status transition", 400);
  }
  await MyGlobal.prisma.hrm_time_track_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.hrm_time_track_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTimeTrackTimesheetTransformer.select(),
    });
  return await HrmTimeTrackTimesheetTransformer.transform(updated);
}
