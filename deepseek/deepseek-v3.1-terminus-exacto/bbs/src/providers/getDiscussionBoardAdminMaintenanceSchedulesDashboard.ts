import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardAdminMaintenanceSchedulesDashboard(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Get the most recent maintenance schedule for dashboard overview
  const recentMaintenance =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findFirst({
      where: {
        deleted_at: null,
      },
      orderBy: { scheduled_start_time: "desc" },
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  if (recentMaintenance) {
    return await DiscussionBoardMaintenanceScheduleTransformer.transform(
      recentMaintenance,
    );
  }
  // If no maintenance schedules exist, return a default one
  const now = toISOStringSafe(new Date());
  return {
    id: v4(),
    maintenance_type: "system_overview",
    scheduled_start_time: now,
    scheduled_end_time: now,
    status: "scheduled",
    impact_level: "low",
    description: "System maintenance dashboard overview",
    actual_start_time: null,
    actual_end_time: null,
    estimated_duration_minutes: 60,
    actual_duration_minutes: null,
    notes: "No maintenance schedules configured yet",
    scheduled_by_admin: {
      id: props.admin.id,
      email: "system@dashboard",
      display_name: "Dashboard System",
      created_at: now,
    },
    performed_by_admin: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
