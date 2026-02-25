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
import { AdminPayload } from "../decorators/payload/AdminPayload";
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
    ...(props.body.search && {
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.maintenance_type && {
      maintenance_type: props.body.maintenance_type,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.impact_level && { impact_level: props.body.impact_level }),
    ...(props.body.scheduled_start_time_from && {
      scheduled_start_time: {
        gte: new Date(props.body.scheduled_start_time_from),
      },
    }),
    ...(props.body.scheduled_start_time_to && {
      scheduled_start_time: {
        lte: new Date(props.body.scheduled_start_time_to),
      },
    }),
    ...(props.body.scheduled_end_time_from && {
      scheduled_end_time: { gte: new Date(props.body.scheduled_end_time_from) },
    }),
    ...(props.body.scheduled_end_time_to && {
      scheduled_end_time: { lte: new Date(props.body.scheduled_end_time_to) },
    }),
  } satisfies Prisma.discussion_board_maintenance_schedulesWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { scheduled_start_time: "desc" as const },
      include: {
        scheduledByAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        performedByAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: whereInput,
    });
  const transformedData = data.map(
    (schedule) =>
      ({
        id: schedule.id as string & tags.Format<"uuid">,
        maintenance_type: schedule.maintenance_type,
        status: schedule.status,
        scheduled_start_time: toISOStringSafe(
          schedule.scheduled_start_time,
        ) as string & tags.Format<"date-time">,
        scheduled_end_time: toISOStringSafe(
          schedule.scheduled_end_time,
        ) as string & tags.Format<"date-time">,
        impact_level: schedule.impact_level,
        estimated_duration_minutes: schedule.estimated_duration_minutes,
        scheduledByAdmin: {
          id: schedule.scheduledByAdmin.id as string & tags.Format<"uuid">,
          email: schedule.scheduledByAdmin.email as string &
            tags.Format<"email">,
          display_name: schedule.scheduledByAdmin.display_name,
          created_at: toISOStringSafe(
            schedule.scheduledByAdmin.created_at,
          ) as string & tags.Format<"date-time">,
        } satisfies IDiscussionBoardAdmin.ISummary,
        performedByAdmin: schedule.performedByAdmin
          ? ({
              id: schedule.performedByAdmin.id as string & tags.Format<"uuid">,
              email: schedule.performedByAdmin.email as string &
                tags.Format<"email">,
              display_name: schedule.performedByAdmin.display_name,
              created_at: toISOStringSafe(
                schedule.performedByAdmin.created_at,
              ) as string & tags.Format<"date-time">,
            } satisfies IDiscussionBoardAdmin.ISummary)
          : null,
      }) satisfies IDiscussionBoardMaintenanceSchedule.ISummary,
  );
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page satisfies number,
            limit: limit satisfies number,
            records: total satisfies number,
            pages: totalPages,
          } satisfies IPage.IPagination,
          data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [] satisfies IDiscussionBoardSection.IPagination[],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardMaintenanceSchedule.ISummary;
}
