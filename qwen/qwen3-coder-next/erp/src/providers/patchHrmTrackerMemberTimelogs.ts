import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerTimelogAtSummaryTransformer } from "../transformers/HrmTrackerTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTrackerTimelog.IRequest;
}): Promise<IPageIHrmTrackerTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine employee_id based on member's role and permissions
  const memberEmployee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!memberEmployee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Build where condition with authorization check
  const whereCondition: Prisma.hrm_tracker_timelogsWhereInput = {
    deleted_at: null,
    employee_id: memberEmployee.id,
  };
  // Apply optional filters from request body
  if (props.body.project_id) {
    whereCondition.project_id = props.body.project_id;
  }
  if (props.body.task_id) {
    whereCondition.task_id = props.body.task_id;
  }
  if (props.body.start_date || props.body.end_date) {
    whereCondition.date = {};
    if (props.body.start_date) {
      whereCondition.date.gte = new Date(props.body.start_date);
    }
    if (props.body.end_date) {
      whereCondition.date.lte = new Date(props.body.end_date);
    }
  }
  if (props.body.billable !== undefined) {
    whereCondition.billable = props.body.billable;
  }
  // Fetch paginated data
  const data = await MyGlobal.prisma.hrm_tracker_timelogs.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    ...HrmTrackerTimelogAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_tracker_timelogs.count({
    where: whereCondition,
  });
  // Transform to response format
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmTrackerTimelogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
