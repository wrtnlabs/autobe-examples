import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberTimesheetsTimesheetIdReject(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.IReject;
}): Promise<IHrmTimeTrackingTimesheet> {
  if (
    props.body.rejectionReason === null ||
    props.body.rejectionReason === undefined
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  const rejectionReason = String(props.body.rejectionReason).trim();
  if (rejectionReason.length === 0) {
    throw new HttpException("Rejection reason is required", 400);
  }
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findFirstOrThrow({
      where: {
        id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        hrm_time_tracking_member_id: member.id,
      },
      select: {
        id: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        reviewed_by_employee_id: true,
        week_start: true,
        week_end: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        reviewedByEmployee:
          HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
      },
    });
  if (timesheet.organization_id !== employee.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.employee_id !== employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "submitted") {
    throw new HttpException("Timesheet is not submitted", 409);
  }
  const updated = await MyGlobal.prisma.hrm_time_tracking_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      status: "rejected",
      reviewed_by_employee_id: employee.id,
      reviewed_at: new Date(),
      rejection_reason: rejectionReason,
      updated_at: new Date(),
    },
    select: {
      id: true,
      organization_id: true,
      employee_id: true,
      reviewed_by_employee_id: true,
      week_start: true,
      week_end: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
      employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
      reviewedByEmployee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
    },
  });
  return {
    id: updated.id,
    organization:
      await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
        updated.organization,
      ),
    employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
      updated.employee,
    ),
    reviewedByEmployee:
      updated.reviewedByEmployee === null
        ? null
        : await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
            updated.reviewedByEmployee,
          ),
    weekStart: toISOStringSafe(updated.week_start),
    weekEnd: toISOStringSafe(updated.week_end),
    status: updated.status,
    submittedAt:
      updated.submitted_at === null
        ? null
        : toISOStringSafe(updated.submitted_at),
    reviewedAt:
      updated.reviewed_at === null
        ? null
        : toISOStringSafe(updated.reviewed_at),
    rejectionReason: updated.rejection_reason === null ? null : true,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
