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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminMaintenanceSchedules(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardMaintenanceSchedule.IRequest;
}): Promise<IPageIDiscussionBoardMaintenanceSchedule.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with structured approach
  const whereConditions: Prisma.discussion_board_maintenance_schedulesWhereInput =
    {
      deleted_at: null,
    };
  // Add filter conditions if provided
  if (props.body.maintenance_type) {
    whereConditions.maintenance_type = props.body.maintenance_type;
  }
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }
  if (props.body.impact_level) {
    whereConditions.impact_level = props.body.impact_level;
  }
  // Handle date range filtering
  if (
    props.body.scheduled_start_time_from ||
    props.body.scheduled_start_time_to
  ) {
    whereConditions.scheduled_start_time = {};
    if (props.body.scheduled_start_time_from) {
      whereConditions.scheduled_start_time.gte =
        props.body.scheduled_start_time_from;
    }
    if (props.body.scheduled_start_time_to) {
      whereConditions.scheduled_start_time.lte =
        props.body.scheduled_start_time_to;
    }
  }
  // Execute paginated query
  const data =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { scheduled_start_time: "desc" },
      include: {
        scheduledByAdmin: {
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
      where: whereConditions,
    });
  // Transform results to ISummary format with proper typing
  const transformedData: IDiscussionBoardMaintenanceSchedule.ISummary[] =
    data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      maintenance_type: record.maintenance_type,
      status: record.status,
      scheduled_start_time: toISOStringSafe(record.scheduled_start_time),
      scheduled_end_time: toISOStringSafe(record.scheduled_end_time),
      impact_level: record.impact_level,
      scheduledByAdmin: {
        id: record.scheduledByAdmin.id as string & tags.Format<"uuid">,
        email: record.scheduledByAdmin.email as string & tags.Format<"email">,
        display_name: record.scheduledByAdmin.display_name,
        created_at: toISOStringSafe(record.scheduledByAdmin.created_at),
      },
    }));
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
