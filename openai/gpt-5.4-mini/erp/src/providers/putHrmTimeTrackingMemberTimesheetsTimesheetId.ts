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
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimesheet.IUpdate;
}): Promise<IHrmTimeTrackingTimesheet> {
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        week_start: true,
        week_end: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        reviewed_by_employee_id: true,
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
  const canChangeWeekStart = props.body.week_start !== undefined;
  const canChangeWeekEnd = props.body.week_end !== undefined;
  const canChangeStatus = props.body.status !== undefined;
  const canChangeSubmittedAt = props.body.submitted_at !== undefined;
  const canChangeReviewedByEmployeeId =
    props.body.reviewed_by_employee_id !== undefined;
  const canChangeReviewedAt = props.body.reviewed_at !== undefined;
  const canChangeRejectionReason = props.body.rejection_reason !== undefined;
  if (
    timesheet.organization_id !== timesheet.organization.id ||
    timesheet.employee.id === undefined
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const nextWeekStart = canChangeWeekStart ? props.body.week_start : null;
  const nextWeekEnd = canChangeWeekEnd ? props.body.week_end : null;
  if (
    nextWeekStart !== null &&
    nextWeekStart !== undefined &&
    nextWeekEnd !== null &&
    nextWeekEnd !== undefined &&
    nextWeekStart > nextWeekEnd
  ) {
    throw new HttpException("Invalid week range", 400);
  }
  if (
    timesheet.status !== "draft" &&
    timesheet.status !== "submitted" &&
    timesheet.status !== "approved" &&
    timesheet.status !== "rejected"
  ) {
    throw new HttpException("Invalid timesheet status", 400);
  }
  if (
    props.body.status === "rejected" &&
    props.body.rejection_reason === undefined
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  if (props.body.status === "approved" || props.body.status === "rejected") {
    if (
      props.body.reviewed_by_employee_id === undefined ||
      props.body.reviewed_at === undefined
    ) {
      throw new HttpException("Reviewer metadata is required", 400);
    }
  }
  await MyGlobal.prisma.hrm_time_tracking_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      ...(canChangeWeekStart && { week_start: props.body.week_start }),
      ...(canChangeWeekEnd && { week_end: props.body.week_end }),
      ...(canChangeStatus && { status: props.body.status }),
      ...(canChangeSubmittedAt && { submitted_at: props.body.submitted_at }),
      ...(canChangeReviewedByEmployeeId && {
        reviewed_by_employee_id: props.body.reviewed_by_employee_id,
      }),
      ...(canChangeReviewedAt && { reviewed_at: props.body.reviewed_at }),
      ...(canChangeRejectionReason && {
        rejection_reason: props.body.rejection_reason,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
  return await HrmTimeTrackingTimesheetTransformer.transform(updated);
}
