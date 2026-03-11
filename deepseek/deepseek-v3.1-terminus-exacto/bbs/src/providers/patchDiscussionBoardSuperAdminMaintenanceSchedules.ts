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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardMaintenanceScheduleAtSummaryTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminMaintenanceSchedules(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardMaintenanceSchedule.IRequest;
}): Promise<IPageIDiscussionBoardMaintenanceSchedule.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Handle nullable date conversions
  const plannedStartAt =
    props.body.planned_start_at !== undefined &&
    props.body.planned_start_at !== null
      ? toISOStringSafe(new Date(props.body.planned_start_at))
      : undefined;
  const plannedEndAt =
    props.body.planned_end_at !== undefined &&
    props.body.planned_end_at !== null
      ? toISOStringSafe(new Date(props.body.planned_end_at))
      : undefined;
  // Handle nullable search field
  const searchValue =
    props.body.search !== undefined && props.body.search !== null
      ? props.body.search.trim()
      : undefined;
  // Build WHERE conditions - fix both status_type_id and maintenance_type to exclude null values
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
    ...(plannedStartAt !== undefined && {
      planned_start_at: { gte: new Date(plannedStartAt) },
    }),
    ...(plannedEndAt !== undefined && {
      planned_end_at: { lte: new Date(plannedEndAt) },
    }),
    ...(searchValue !== undefined &&
      searchValue.length > 0 && {
        OR: [
          {
            title: {
              contains: searchValue,
              mode: "insensitive" as const,
            },
          },
          {
            description: {
              contains: searchValue,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  } satisfies Prisma.discussion_board_maintenance_schedulesWhereInput;
  // Order by planned start date
  const orderByInput = { planned_start_at: "asc" as const };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardMaintenanceScheduleAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: whereInput,
    }),
  ]);
  // Transform results
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
