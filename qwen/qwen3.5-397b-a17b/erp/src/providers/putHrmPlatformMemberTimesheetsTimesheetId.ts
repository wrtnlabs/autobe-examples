import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IUpdate;
}): Promise<IHrmPlatformTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        employee_id: true,
        status: true,
        deleted_at: true,
        week_start_date: true,
        week_end_date: true,
        employee: {
          select: {
            user_id: true,
          },
        },
      },
    });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException(
      "Cannot update timesheet with status: " + timesheet.status,
      400,
    );
  }
  if (timesheet.employee.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.week_start_date !== undefined ||
    props.body.week_end_date !== undefined
  ) {
    const weekStartDate =
      props.body.week_start_date ?? timesheet.week_start_date;
    const weekEndDate = props.body.week_end_date ?? timesheet.week_end_date;
    const startDate = new Date(weekStartDate + "T00:00:00Z");
    const endDate = new Date(weekEndDate + "T00:00:00Z");
    if (startDate.getUTCDay() !== 1) {
      throw new HttpException("week_start_date must be a Monday", 400);
    }
    if (endDate.getUTCDay() !== 0) {
      throw new HttpException("week_end_date must be a Sunday", 400);
    }
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setUTCDate(startDate.getUTCDate() + 6);
    if (endDate.getTime() !== expectedEndDate.getTime()) {
      throw new HttpException(
        "week_end_date must be the Sunday of the same week as week_start_date",
        400,
      );
    }
    const existing = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee_id: timesheet.employee_id,
        week_start_date: weekStartDate,
        id: { not: props.timesheetId },
        deleted_at: null,
      },
    });
    if (existing !== null) {
      throw new HttpException("A timesheet for this week already exists", 400);
    }
  }
  const updated = await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      ...(props.body.week_start_date !== undefined && {
        week_start_date: props.body.week_start_date,
      }),
      ...(props.body.week_end_date !== undefined && {
        week_end_date: props.body.week_end_date,
      }),
      ...(props.body.rejection_reason !== undefined && {
        rejection_reason: props.body.rejection_reason,
      }),
      updated_at: new Date(),
    },
    ...HrmPlatformTimesheetTransformer.select(),
  });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
