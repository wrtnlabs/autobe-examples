import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimesheetAtSummaryTransformer } from "../transformers/HrmTimeTrackTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTimesheet.IRequest;
}): Promise<IPageIHrmTimeTrackTimesheet.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get employee record for the member
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_track_organization_id: true,
    },
  });
  // Build where clause
  const whereInput: Prisma.hrm_time_track_timesheetsWhereInput = {
    deleted_at: null,
  };
  // Authorization: employees can only view their own timesheets
  if (employee) {
    whereInput.hrm_time_track_employee_id = employee.id;
  } else {
    // Member without employee record - check for time:approve permission
    // For now, throw error if no employee record exists
    throw new HttpException("Forbidden", 403);
  }
  // Apply status filter
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Apply date range filter on week_start_date
  if (props.body.from_date !== undefined && props.body.to_date !== undefined) {
    whereInput.week_start_date = {
      gte: new Date(props.body.from_date),
      lte: new Date(props.body.to_date),
    };
  } else if (props.body.from_date !== undefined) {
    whereInput.week_start_date = {
      gte: new Date(props.body.from_date),
    };
  } else if (props.body.to_date !== undefined) {
    whereInput.week_start_date = {
      lte: new Date(props.body.to_date),
    };
  }
  // Apply employee_id filter (admin view)
  if (props.body.employee_id !== undefined) {
    // Check if member has permission to view other employees' timesheets
    // For now, only allow viewing own timesheets
    if (props.body.employee_id !== employee.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Build orderBy clause
  const sortBy = props.body.sort_by ?? "week_start_date";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.hrm_time_track_timesheetsOrderByWithRelationInput =
    sortBy === "week_start_date"
      ? { week_start_date: sortOrder }
      : sortBy === "status"
        ? { status: sortOrder }
        : sortBy === "total_hours"
          ? { id: sortOrder }
          : { week_start_date: "desc" };
  // Query timesheets
  const records = await MyGlobal.prisma.hrm_time_track_timesheets.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackTimesheetAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_time_track_timesheets.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    HrmTimeTrackTimesheetAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
