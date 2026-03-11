import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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

export async function getDiscussionBoardAdminMaintenanceSchedulesScheduleId(props: {
  admin: AdminPayload;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMaintenanceSchedule> {
  const schedule =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findUniqueOrThrow(
      {
        where: { id: props.scheduleId },
        ...DiscussionBoardMaintenanceScheduleTransformer.select(),
      },
    );
  return await DiscussionBoardMaintenanceScheduleTransformer.transform(
    schedule,
  );
}
