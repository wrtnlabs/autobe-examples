import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardMaintenanceScheduleAtSummaryTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminMaintenanceSchedules(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardMaintenanceSchedule.IRequest;
}): Promise<IPageIDiscussionBoardMaintenanceSchedule.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filters
  const whereInput: Prisma.discussion_board_maintenance_schedulesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.maintenance_type && {
      maintenance_type: props.body.maintenance_type,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.impact_level && {
      impact_level: props.body.impact_level,
    }),
    ...((props.body.scheduled_start_time_from ||
      props.body.scheduled_start_time_to) && {
      scheduled_start_time: {
        ...(props.body.scheduled_start_time_from && {
          gte: new Date(props.body.scheduled_start_time_from),
        }),
        ...(props.body.scheduled_start_time_to && {
          lte: new Date(props.body.scheduled_start_time_to),
        }),
      },
    }),
    ...((props.body.scheduled_end_time_from ||
      props.body.scheduled_end_time_to) && {
      scheduled_end_time: {
        ...(props.body.scheduled_end_time_from && {
          gte: new Date(props.body.scheduled_end_time_from),
        }),
        ...(props.body.scheduled_end_time_to && {
          lte: new Date(props.body.scheduled_end_time_to),
        }),
      },
    }),
  };
  // Fetch paginated data with correct table name
  const data =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { scheduled_start_time: "desc" as const },
      ...DiscussionBoardMaintenanceScheduleAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardMaintenanceScheduleAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  // Return with correct pagination structure
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
