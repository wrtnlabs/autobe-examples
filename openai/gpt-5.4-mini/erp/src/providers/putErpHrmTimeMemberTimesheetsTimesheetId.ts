import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheet.IUpdate;
}): Promise<IErpHrmTimeTimesheet> {
  const current = await MyGlobal.prisma.erp_hrm_time_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      erp_hrm_time_employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      reviewed_by_member_id: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          erp_hrm_time_member_id: true,
          erp_hrm_time_organization_id: true,
        },
      },
    },
  });
  if (current === null) throw new HttpException("Not Found", 404);
  if (current.employee.erp_hrm_time_member_id !== props.member.id)
    throw new HttpException("Forbidden", 403);
  const nextWeekStartDate: string | undefined = props.body.weekStartDate;
  const nextWeekEndDate: string | undefined = props.body.weekEndDate;
  const nextStatus: string | undefined = props.body.status;
  const nextSubmittedAt:
    | (string & tags.Format<"date-time">)
    | null
    | undefined = props.body.submittedAt;
  const nextReviewedAt: (string & tags.Format<"date-time">) | null | undefined =
    props.body.reviewedAt;
  const nextReviewedByMemberId:
    | (string & tags.Format<"uuid">)
    | null
    | undefined = props.body.reviewedByMemberId;
  const nextRejectionReason: string | null | undefined =
    props.body.rejectionReason;
  if (
    nextWeekStartDate !== undefined &&
    new Date(nextWeekStartDate).getUTCDay() !== 1
  )
    throw new HttpException("Conflict", 409);
  if (
    nextWeekEndDate !== undefined &&
    new Date(nextWeekEndDate).getUTCDay() !== 0
  )
    throw new HttpException("Conflict", 409);
  const resolvedWeekStartDate: string =
    nextWeekStartDate ?? current.week_start_date.toISOString();
  const resolvedWeekEndDate: string =
    nextWeekEndDate ?? current.week_end_date.toISOString();
  if (resolvedWeekStartDate > resolvedWeekEndDate)
    throw new HttpException("Conflict", 409);
  const ownerEditable: boolean =
    current.status === "draft" || current.status === "rejected";
  const reviewFieldsProvided: boolean =
    nextStatus !== undefined ||
    nextSubmittedAt !== undefined ||
    nextReviewedAt !== undefined ||
    nextReviewedByMemberId !== undefined ||
    nextRejectionReason !== undefined;
  if (!ownerEditable && !reviewFieldsProvided)
    throw new HttpException("Forbidden", 403);
  if (
    nextStatus === "rejected" &&
    (nextRejectionReason === undefined || nextRejectionReason === null)
  ) {
    throw new HttpException("Conflict", 409);
  }
  if (nextStatus === "approved" || nextStatus === "rejected") {
    if (
      nextReviewedAt === undefined ||
      nextReviewedAt === null ||
      nextReviewedByMemberId === undefined ||
      nextReviewedByMemberId === null
    ) {
      throw new HttpException("Conflict", 409);
    }
  }
  if (
    nextStatus !== undefined &&
    nextStatus !== "draft" &&
    nextStatus !== "submitted" &&
    nextStatus !== "approved" &&
    nextStatus !== "rejected"
  ) {
    throw new HttpException("Conflict", 409);
  }
  const duplicate = await MyGlobal.prisma.erp_hrm_time_timesheets.findFirst({
    where: {
      id: { not: props.timesheetId },
      erp_hrm_time_employee_id: current.erp_hrm_time_employee_id,
      week_start_date: current.week_start_date,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (duplicate !== null && nextWeekStartDate !== undefined)
    throw new HttpException("Conflict", 409);
  await MyGlobal.prisma.erp_hrm_time_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      ...(nextWeekStartDate !== undefined
        ? { week_start_date: new Date(nextWeekStartDate) }
        : {}),
      ...(nextWeekEndDate !== undefined
        ? { week_end_date: new Date(nextWeekEndDate) }
        : {}),
      ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      ...(nextSubmittedAt !== undefined
        ? {
            submitted_at:
              nextSubmittedAt === null ? null : new Date(nextSubmittedAt),
          }
        : {}),
      ...(nextReviewedAt !== undefined
        ? {
            reviewed_at:
              nextReviewedAt === null ? null : new Date(nextReviewedAt),
          }
        : {}),
      ...(nextReviewedByMemberId !== undefined
        ? { reviewed_by_member_id: nextReviewedByMemberId }
        : {}),
      ...(nextRejectionReason !== undefined
        ? { rejection_reason: nextRejectionReason }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
  return await ErpHrmTimeTimesheetTransformer.transform(updated);
}
