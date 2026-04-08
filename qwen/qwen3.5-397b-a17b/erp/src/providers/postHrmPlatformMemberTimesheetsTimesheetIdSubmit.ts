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

export async function postHrmPlatformMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  // Step 1: Find the timesheet and verify it exists
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: {
      id: props.timesheetId,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      status: true,
      week_start_date: true,
      week_end_date: true,
      employee: {
        select: {
          id: true,
          member_id: true,
          status: true,
        },
      },
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Step 2: Verify ownership - get member's employee record
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Step 3: Check ownership
  if (timesheet.employee_id !== memberEmployee.id) {
    throw new HttpException("Forbidden: You do not own this timesheet", 403);
  }
  // Step 4: Validate status is draft
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet must be in draft status to submit", 400);
  }
  // Step 5: Check that at least one timelog exists for this timesheet
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_timesheet_id: timesheet.id,
      deleted_at: null,
    },
  });
  if (timelogCount === 0) {
    throw new HttpException(
      "Timesheet must contain at least one timelog entry",
      400,
    );
  }
  // Step 6: Check for duplicate timesheet in same week (submitted or approved)
  const duplicateTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee_id: timesheet.employee_id,
        week_start_date: timesheet.week_start_date,
        status: {
          in: ["submitted", "approved"],
        },
        deleted_at: null,
        id: {
          not: timesheet.id,
        },
      },
    });
  if (duplicateTimesheet) {
    throw new HttpException(
      "A timesheet for this week is already submitted or approved",
      409,
    );
  }
  // Step 7: Update timesheet status to submitted
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
  });
  // Step 8: Fetch updated timesheet with full relations for response
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
