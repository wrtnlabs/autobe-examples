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

export async function postHrmPlatformMemberTimesheetsTimesheetIdApprove(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheet> {
  // Find the timesheet and verify it exists
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        hrm_platform_employee_id: true,
        hrm_platform_member_id: true,
        week_start_date: true,
        week_end_date: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            hrm_platform_organization_id: true,
          },
        },
      },
    });
  // Verify timesheet is in submitted status - only submitted timesheets can be approved
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not in submitted status", 400);
  }
  // Verify the member belongs to the same organization as the employee
  // This ensures organization-scoped access control
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
      employees: {
        some: {
          hrm_platform_organization_id:
            timesheet.employee.hrm_platform_organization_id,
          deleted_at: null,
        },
      },
    },
  });
  if (!member) {
    throw new HttpException(
      "You do not have permission to approve this timesheet",
      403,
    );
  }
  // Update the timesheet with reviewer information and approved status
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      hrm_platform_member_id: props.member.id,
      reviewed_at: new Date(),
      status: "approved",
      updated_at: new Date(),
    },
  });
  // Query the updated timesheet with full select including employee, reviewer, and timelogs
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  // Transform and return the approved timesheet
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
