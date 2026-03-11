import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardMaintenanceScheduleAtSummaryTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminMaintenanceSchedules(props: {
  admin: AdminPayload;
  body: IDiscussionBoardMaintenanceSchedule.IRequest;
}): Promise<IPageIDiscussionBoardMaintenanceSchedule.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.status_type_id !== undefined &&
      props.body.status_type_id !== null && {
        status_type_id: props.body.status_type_id,
      }),
    ...(props.body.maintenance_type !== undefined &&
      props.body.maintenance_type !== null && {
        maintenance_type: props.body.maintenance_type,
      }),
    ...(props.body.planned_start_at !== undefined &&
      props.body.planned_start_at !== null && {
        planned_start_at: { gte: new Date(props.body.planned_start_at) },
      }),
    ...(props.body.planned_end_at !== undefined &&
      props.body.planned_end_at !== null && {
        planned_end_at: { lte: new Date(props.body.planned_end_at) },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.trim() !== "" && {
        OR: [
          { title: { contains: props.body.search } },
          { description: { contains: props.body.search } },
        ],
      }),
  } satisfies Prisma.discussion_board_maintenance_schedulesWhereInput;
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { planned_start_at: "desc" },
      ...DiscussionBoardMaintenanceScheduleAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardMaintenanceScheduleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
