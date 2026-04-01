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
  // 1. Fetch timesheet with employee relation
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    include: {
      employee: true,
    },
  });
  // 2. Validate ownership
  if (timesheet.hrms_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate status is draft (rejected can be resubmitted)
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  // 4. Count timelogs for this timesheet (by employee and week date range)
  const timelogCount = await MyGlobal.prisma.hrms_timelogs.count({
    where: {
      employee_id: timesheet.hrms_employee_id,
      date: {
        gte: timesheet.week_start_date,
        lte: timesheet.week_end_date,
      },
    },
  });
  if (timelogCount === 0) {
    throw new HttpException("Timesheet must contain at least one timelog", 400);
  }
  // 5. Check for duplicate week submission
  const existingSubmission = await MyGlobal.prisma.hrms_timesheets.findFirst({
    where: {
      hrms_employee_id: timesheet.hrms_employee_id,
      week_start_date: timesheet.week_start_date,
      status: {
        in: ["submitted", "approved"],
      },
      deleted_at: null,
    },
  });
  if (existingSubmission !== null) {
    throw new HttpException(
      "A timesheet for this week is already submitted or approved",
      400,
    );
  }
  // 6. Verify employee is active
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      id: timesheet.hrms_employee_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee account has been deactivated", 400);
  }
  // 7. Update timesheet status and submitted_at
  await MyGlobal.prisma.hrms_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "submitted",
      submitted_at: new Date(),
    },
  });
  // 8. Fetch and transform updated timesheet
  const updatedTimesheet =
    await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      ...HrmsTimesheetTransformer.select(),
    });
  return await HrmsTimesheetTransformer.transform(updatedTimesheet);
}
