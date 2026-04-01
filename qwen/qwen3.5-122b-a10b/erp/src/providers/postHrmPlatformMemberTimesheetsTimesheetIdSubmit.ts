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
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const timesheet = await tx.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_member_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            hrm_platform_user_id: true,
            organization: {
              select: {
                id: true,
              },
            },
          },
        },
        timesheetTimelogs: {
          select: {
            id: true,
          },
        },
      },
    });
    if (timesheet.employee.hrm_platform_user_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (timesheet.status !== "draft") {
      throw new HttpException("Timesheet is not in draft status", 400);
    }
    if (timesheet.timesheetTimelogs.length === 0) {
      throw new HttpException(
        "Timesheet cannot be submitted without timelogs",
        400,
      );
    }
    const conflict = await tx.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: timesheet.hrm_platform_employee_id,
        week_start_date: timesheet.week_start_date,
        status: { in: ["submitted", "approved"] },
        id: { not: props.timesheetId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (conflict) {
      throw new HttpException("Weekly timesheet conflict", 409);
    }
    const now = new Date();
    await tx.hrm_platform_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        status: "submitted",
        submitted_at: now,
        reviewed_at: null,
        rejection_reason: null,
        updated_at: now,
      },
    });
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: timesheet.employee.organization.id,
        user_id: props.member.id,
        action_type: "timesheet:submitted",
        target_entity: "timesheet",
        target_id: props.timesheetId,
        details: JSON.stringify({
          week_start_date: toISOStringSafe(timesheet.week_start_date),
          week_end_date: toISOStringSafe(timesheet.week_end_date),
        }),
        created_at: now,
      },
    });
    const updated = await tx.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
    return await HrmPlatformTimesheetTransformer.transform(updated);
  });
}
