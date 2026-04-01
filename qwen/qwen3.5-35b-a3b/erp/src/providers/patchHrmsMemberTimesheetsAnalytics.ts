import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
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

export async function patchHrmsMemberTimesheetsAnalytics(props: {
  member: MemberPayload;
  body: IHrmsTimesheet.IRequest;
}): Promise<IPageIHrmsTimesheet.ISummary> {
  const organizationId = props.body.organization_id;
  const startDate = props.body.start_date;
  const endDate = props.body.end_date;
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? 20;
  const sortOrder = props.body.sort_order ?? "desc";
  const sortBy = "week_start_date";
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Page size must be between 1 and 100", 400);
  }
  if (startDate && endDate && startDate > endDate) {
    throw new HttpException("Start date must be before end date", 400);
  }
  const skip = (page - 1) * limit;
  const whereClause: Prisma.hrms_timesheetsWhereInput = {
    deleted_at: null,
    week_start_date: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    },
    status: { in: ["draft", "submitted", "approved", "rejected"] },
  };
  const data = await MyGlobal.prisma.hrms_timesheets.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });
  const total = await MyGlobal.prisma.hrms_timesheets.count({
    where: whereClause,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      week_start_date: toISOStringSafe(item.week_start_date),
      week_end_date: toISOStringSafe(item.week_end_date),
      status: item.status,
      total_hours: item.total_hours,
      submitted_at: item.submitted_at
        ? toISOStringSafe(item.submitted_at)
        : null,
      reviewed_at: item.reviewed_at ? toISOStringSafe(item.reviewed_at) : null,
      rejection_reason: item.rejection_reason ?? null,
      utilization_percentage: 0,
      utilization_flag: false,
      project_id: "",
      project_name: "",
      budget_hours: 0,
      actual_hours: 0,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
