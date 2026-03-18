import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTimesheet.IUpdate;
}): Promise<IErpHrmTimeTrackingTimesheet> {
  const { member, timesheetId, body } = props;
  const prisma = MyGlobal.prisma;
  const existing = await prisma.erp_hrm_time_tracking_timesheets.findUnique({
    where: { id: timesheetId },
    select: {
      id: true,
      erp_hrm_time_tracking_organization_id: true,
      erp_hrm_time_tracking_employee_id: true,
      week_start_at: true,
      week_end_at: true,
      status: true,
      submitted_at: true,
      approved_at: true,
      rejected_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (existing === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Employee-scoped access: only update own timesheet
  if (existing.erp_hrm_time_tracking_employee_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await prisma.erp_hrm_time_tracking_timesheets.update({
    where: { id: timesheetId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.submitted_at !== undefined && {
        submitted_at:
          body.submitted_at === null ? null : new Date(body.submitted_at),
      }),
      ...(body.approved_at !== undefined && {
        approved_at:
          body.approved_at === null ? null : new Date(body.approved_at),
      }),
      ...(body.rejected_at !== undefined && {
        rejected_at:
          body.rejected_at === null ? null : new Date(body.rejected_at),
      }),
      updated_at: new Date(),
    },
    select: {
      id: true,
      erp_hrm_time_tracking_organization_id: true,
      erp_hrm_time_tracking_employee_id: true,
      week_start_at: true,
      week_end_at: true,
      status: true,
      submitted_at: true,
      approved_at: true,
      rejected_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    erpHrmTimeTrackingOrganizationId:
      updated.erp_hrm_time_tracking_organization_id as string &
        tags.Format<"uuid">,
    erpHrmTimeTrackingEmployeeId:
      updated.erp_hrm_time_tracking_employee_id as string & tags.Format<"uuid">,
    weekStartAt: updated.week_start_at.toISOString(),
    weekEndAt: updated.week_end_at.toISOString(),
    status: updated.status,
    submittedAt: updated.submitted_at?.toISOString() ?? null,
    approvedAt: updated.approved_at?.toISOString() ?? null,
    rejectedAt: updated.rejected_at?.toISOString() ?? null,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    deletedAt: updated.deleted_at?.toISOString() ?? null,
  };
}
