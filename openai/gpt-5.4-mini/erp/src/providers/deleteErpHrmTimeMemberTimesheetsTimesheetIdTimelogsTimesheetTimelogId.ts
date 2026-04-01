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

export async function deleteErpHrmTimeMemberTimesheetsTimesheetIdTimelogsTimesheetTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetTimelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        status: true,
        erp_hrm_time_employee_id: true,
        deleted_at: true,
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Timesheet is not editable", 409);
  }
  const membership =
    await MyGlobal.prisma.erp_hrm_time_members.findFirstOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  void membership;
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: timesheet.erp_hrm_time_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  void employee;
  await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findFirstOrThrow({
    where: {
      id: props.timesheetTimelogId,
      erp_hrm_time_timesheet_id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.delete({
    where: {
      id: props.timesheetTimelogId,
    },
  });
}
