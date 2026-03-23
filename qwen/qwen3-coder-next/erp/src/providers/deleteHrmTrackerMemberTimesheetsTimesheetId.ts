import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTrackerMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_tracker_employee_id: true,
        hrm_tracker_organization_id: true,
        status: true,
      },
    });
  if (timesheet.status === "approved" || timesheet.status === "rejected") {
    throw new HttpException("Forbidden: timesheet is in final state", 403);
  }
  const isOwner = timesheet.hrm_tracker_employee_id === props.member.id;
  const hasManagePermission =
    (props.member as any).permissions?.includes("time:manage") === true;
  if (!isOwner && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_tracker_timesheets.update({
    where: { id: props.timesheetId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  await MyGlobal.prisma.hrm_tracker_timesheet_timelogs.deleteMany({
    where: { hrm_tracker_timesheet_id: props.timesheetId },
  });
  return;
}
