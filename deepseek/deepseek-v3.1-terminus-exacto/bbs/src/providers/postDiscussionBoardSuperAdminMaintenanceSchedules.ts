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
import { DiscussionBoardMaintenanceScheduleCollector } from "../collectors/DiscussionBoardMaintenanceScheduleCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardMaintenanceScheduleTransformer } from "../transformers/DiscussionBoardMaintenanceScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminMaintenanceSchedules(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardMaintenanceSchedule.ICreate;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  // Validate scheduled times are in the future using string comparison
  const now = toISOStringSafe(new Date());
  if (props.body.scheduled_start_time <= now) {
    throw new HttpException("Scheduled start time must be in the future", 400);
  }
  if (props.body.scheduled_end_time <= props.body.scheduled_start_time) {
    throw new HttpException("Scheduled end time must be after start time", 400);
  }
  // Validate estimated duration matches scheduled time difference
  const startTime = new Date(props.body.scheduled_start_time);
  const endTime = new Date(props.body.scheduled_end_time);
  const expectedDuration = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60),
  );
  if (props.body.estimated_duration_minutes !== expectedDuration) {
    throw new HttpException(
      `Estimated duration must match scheduled time difference (expected: ${expectedDuration} minutes)`,
      400,
    );
  }
  // Validate maintenance_type and impact_level are valid values
  const validMaintenanceTypes = [
    "system update",
    "database backup",
    "security patch",
    "infrastructure maintenance",
  ];
  const validImpactLevels = ["low", "medium", "high", "critical"];
  if (!validMaintenanceTypes.includes(props.body.maintenance_type)) {
    throw new HttpException(
      `Invalid maintenance type. Must be one of: ${validMaintenanceTypes.join(", ")}`,
      400,
    );
  }
  if (!validImpactLevels.includes(props.body.impact_level)) {
    throw new HttpException(
      `Invalid impact level. Must be one of: ${validImpactLevels.join(", ")}`,
      400,
    );
  }
  const created =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.create({
      data: await DiscussionBoardMaintenanceScheduleCollector.collect({
        body: props.body,
        discussionBoardAdmins: { id: props.superAdmin.id } as IEntity,
      }),
      ...DiscussionBoardMaintenanceScheduleTransformer.select(),
    });
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(created);
}
