import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.maintenance_type && {
      maintenance_type: props.body.maintenance_type,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.impact_level && { impact_level: props.body.impact_level }),
    ...(props.body.scheduled_start_time_from &&
    props.body.scheduled_start_time_to
      ? {
          scheduled_start_time: {
            gte: props.body.scheduled_start_time_from,
            lte: props.body.scheduled_start_time_to,
          },
        }
      : props.body.scheduled_start_time_from
        ? {
            scheduled_start_time: {
              gte: props.body.scheduled_start_time_from,
            },
          }
        : props.body.scheduled_start_time_to
          ? {
              scheduled_start_time: {
                lte: props.body.scheduled_start_time_to,
              },
            }
          : {}),
  } satisfies Prisma.discussion_board_maintenance_schedulesWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { scheduled_start_time: "desc" as const },
      ...DiscussionBoardMaintenanceScheduleAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: whereInput,
    });
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
