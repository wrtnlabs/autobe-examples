import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTimelogAtSummaryTransformer } from "../transformers/HrmTimeTrackTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackTimelog.IRequest;
}): Promise<IPageIHrmTimeTrackTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get organization context from member's session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  // Build where clause with all filters
  const whereInput = {
    deleted_at: null,
    hrm_time_track_organization_id: session.hrm_time_track_organization_id,
    // Date range filter
    ...(props.body.from_date && {
      date: { gte: new Date(props.body.from_date) },
    }),
    ...(props.body.to_date && {
      date: { lte: new Date(props.body.to_date) },
    }),
    // Project filter
    ...(props.body.project_id && {
      hrm_time_track_project_id: props.body.project_id,
    }),
    // Task filter
    ...(props.body.task_id && {
      hrm_time_track_task_id: props.body.task_id,
    }),
    // Billable filter
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    // Employee filter
    ...(props.body.employee_id && {
      hrm_time_track_employee_id: props.body.employee_id,
    }),
  } satisfies Prisma.hrm_time_track_timelogsWhereInput;
  // Build order by clause
  const sort = props.body.sort ?? "date";
  const order = (props.body.order ?? "desc") as "asc" | "desc";
  const orderByInput = (() => {
    switch (sort) {
      case "date":
        return { date: order };
      case "duration_seconds":
        return { duration_seconds: order };
      case "project_id":
        return { hrm_time_track_project_id: order };
      case "employee_id":
        return { hrm_time_track_employee_id: order };
      case "id":
        return { id: order };
      default:
        return { date: "desc" };
    }
  })() satisfies Prisma.hrm_time_track_timelogsOrderByWithRelationInput;
  // Get records and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_time_track_timelogs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackTimelogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_time_track_timelogs.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackTimelogAtSummaryTransformer.transform,
    ),
  };
}
