import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackTaskHistoryAtSummaryTransformer } from "../transformers/HrmTimeTrackTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberTasksTaskIdHistories(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackTaskHistory.IRequest;
}): Promise<IPageIHrmTimeTrackTaskHistory.ISummary> {
  // Validate task exists
  await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
  });
  // Build where clause with all filters
  const whereInput = {
    hrm_time_track_task_id: props.taskId,
    ...(props.body.search && {
      OR: [
        {
          previous_status: { contains: props.body.search, mode: "insensitive" },
        },
        { new_status: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.previous_status && {
      previous_status: props.body.previous_status,
    }),
    ...(props.body.new_status && {
      new_status: props.body.new_status,
    }),
    ...(props.body.from_date && {
      created_at: { gte: props.body.from_date },
    }),
    ...(props.body.to_date && {
      created_at: { lte: props.body.to_date },
    }),
    ...(props.body.member_id && {
      hrm_time_track_member_id: props.body.member_id,
    }),
  } satisfies Prisma.hrm_time_track_task_historiesWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query records and count total
  const records = await MyGlobal.prisma.hrm_time_track_task_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    ...HrmTimeTrackTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_track_task_histories.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackTaskHistoryAtSummaryTransformer.transform,
    ),
  };
}
