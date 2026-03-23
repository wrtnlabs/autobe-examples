import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTimesheetTransformer } from "../transformers/HrmTrackerTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string;
  body: IHrmTrackerTimesheet.IUpdate;
}): Promise<IHrmTrackerTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        hrm_tracker_employee_id: true,
        hrm_tracker_organization_id: true,
        updated_at: true,
      },
    });
  // Strict state transition validation
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException(
      "Timesheet cannot be updated - must be draft or rejected",
      400,
    );
  }
  // Ownership validation: timesheet belongs to employee of member
  // Fetch employee with relationship to organization
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      id: timesheet.hrm_tracker_employee_id,
      user: { id: props.member.id },
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify organization match (fetch organization from employee relationship)
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findFirst({
      where: {
        id: timesheet.hrm_tracker_organization_id,
        employees: { some: { id: employee.id } },
        deleted_at: null,
      },
    });
  if (!organization) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.hrm_tracker_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      status: props.body.status,
      total_hours: props.body.total_hours,
      rejection_reason: props.body.rejection_reason ?? null,
      updated_at: now,
      reviewed_at: props.body.status === "rejected" ? now : null,
    },
    select: {
      id: true,
      hrm_tracker_organization_id: true,
      hrm_tracker_employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      total_hours: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reviewer: true,
      reviewed_by_member_id: true,
      organization: true,
      employee: true,
    },
  });
  return await HrmTrackerTimesheetTransformer.transform(updated);
}
