import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTimesheetAtSummaryTransformer } from "../transformers/HrmTrackerTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTrackerTimesheet.IRequest;
}): Promise<IPageIHrmTrackerTimesheet.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Authorization check: members can only view their own timesheets unless they have time:approve or time:view_all permissions
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  // Build where clause with filters
  const where: Prisma.hrm_tracker_timesheetsWhereInput = {
    hrm_tracker_employee_id: employee.id,
    deleted_at: null,
    status: props.body.status,
  };
  if (props.body.week_start_date) {
    where.week_start_date = {
      gte: new Date(props.body.week_start_date),
    };
  }
  if (props.body.week_end_date) {
    where.week_end_date = {
      lte: new Date(props.body.week_end_date),
    };
  }
  const data = await MyGlobal.prisma.hrm_tracker_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy: { week_start_date: "desc" },
    ...HrmTrackerTimesheetAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_tracker_timesheets.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTrackerTimesheetAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
