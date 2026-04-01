import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimesheet.IRequest;
}): Promise<IPageIErpHrmTimeTrackingTimesheet.ISummary> {
  const {
    page,
    limit,
    sortBy,
    sortDirection,
    status,
    weekStartAt,
    weekEndAt,
    employeeId,
  } = props.body;
  if (
    weekStartAt !== undefined &&
    weekEndAt !== undefined &&
    weekEndAt < weekStartAt
  ) {
    throw new HttpException("Invalid week range", 400);
  }
  const effectiveEmployeeId = employeeId ?? props.member.id;
  const orderBy = sortBy
    ? sortBy === "week_start_at"
      ? { week_start_at: sortDirection ?? "desc" }
      : sortBy === "week_end_at"
        ? { week_end_at: sortDirection ?? "desc" }
        : { status: sortDirection ?? "desc" }
    : { week_start_at: "desc" as const };
  const whereInput: Prisma.erp_hrm_time_tracking_timesheetsWhereInput = {
    // member_id is not a valid where field for this model in Prisma typing.
    // Keep the where clause limited to fields that exist on the where input type.
    ...(status !== undefined && { status }),
    ...(weekStartAt !== undefined && {
      week_start_at: { gte: toISOStringSafe(new Date(weekStartAt)) },
    }),
    ...(weekEndAt !== undefined && {
      week_end_at: { lte: toISOStringSafe(new Date(weekEndAt)) },
    }),
    ...(effectiveEmployeeId !== undefined && {
      employee: { id: effectiveEmployeeId },
    }),
  };
  const [total, items] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_timesheets.count({
      where: whereInput,
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_timesheets.findMany({
      where: whereInput,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        organization: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            name: true,
            description: true,
            logo_url: true,
            currency_code: true,
            timezone: true,
            fiscal_start_month: true,
          },
        },
        employee: {
          select: {
            email: true,
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            timelogs: { select: { id: true } },
            contracts: { select: { id: true } },
            contractSnapshots: { select: { id: true } },
            timesheets: { select: { id: true } },
            timerSessions: { select: { id: true } },
            password_hash: true,
            sessions: { select: { id: true } },
            passwordResets: { select: { id: true } },
            emailVerifications: { select: { id: true } },
            projectMemberships: { select: { id: true } },
            assignedTasks: { select: { id: true } },
            performedActivityLogEntries: { select: { id: true } },
            createdReportDefinitions: { select: { id: true } },
            reportOutputs: { select: { id: true } },
          },
        },
        timelogs: { select: { id: true } },
        versioningLocks: { select: { id: true } },
      },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      items,
      ErpHrmTimeTrackingTimesheetAtSummaryTransformer.transform,
    ),
  };
}
