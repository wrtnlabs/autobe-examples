import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimesheetTransformer } from "../transformers/HrmsTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmsTimesheet> {
  const now = new Date();
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrms_employee_id: true,
      week_start_date: true,
      status: true,
      employee: {
        select: {
          id: true,
          organization_member_id: true,
          deleted_at: true,
        },
      },
    },
  });
  const employee = timesheet.employee;
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee has been deactivated", 400);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrms_member_id: true,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  const duplicateSubmission = await MyGlobal.prisma.hrms_timesheets.findFirst({
    where: {
      hrms_employee_id: employee.id,
      week_start_date: timesheet.week_start_date,
      status: {
        in: ["submitted", "approved"],
      },
      deleted_at: null,
      id: {
        not: props.timesheetId,
      },
    },
  });
  if (duplicateSubmission !== null) {
    throw new HttpException(
      "Another timesheet for this week is already submitted or approved",
      400,
    );
  }
  await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
  });
  const updated = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...HrmsTimesheetTransformer.select(),
  });
  return await HrmsTimesheetTransformer.transform(updated);
}
