import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerMemberProjectsProjectIdActivitySummary(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmTrackerProject.ISummaryActivity> {
  // Check if project exists and get its organization
  const project = await MyGlobal.prisma.hrm_tracker_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { hrm_tracker_organization_id: true },
  });
  // Get all activity logs for this project
  const activityLogs = await MyGlobal.prisma.hrm_tracker_activity_logs.findMany(
    {
      where: {
        target_entity_type: "project",
        target_entity_id: props.projectId,
      },
      select: {
        id: true,
        action_type: true,
        created_at: true,
        actorMember: {
          select: { id: true },
        },
        actorGuest: {
          select: { id: true },
        },
        target_entity_type: true,
        target_entity_id: true,
      },
    },
  );
  // Calculate summary statistics
  const totalCount = activityLogs.length;
  // Activity breakdown by type
  const activityBreakdown: Record<string, number> = {};
  activityLogs.forEach((log) => {
    activityBreakdown[log.action_type] =
      (activityBreakdown[log.action_type] || 0) + 1;
  });
  // Extract dates and calculate min/max
  const dates = activityLogs.map((log) => new Date(log.created_at).getTime());
  const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
  return {
    total_count: totalCount,
    activity_breakdown: activityBreakdown,
    date_range: {
      start: toISOStringSafe(minDate),
      end: toISOStringSafe(maxDate),
    },
    first_activity: toISOStringSafe(minDate),
    last_activity: toISOStringSafe(maxDate),
  };
}
