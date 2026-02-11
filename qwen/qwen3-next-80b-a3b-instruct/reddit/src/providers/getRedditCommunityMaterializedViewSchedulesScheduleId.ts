import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityMaterializedViewScheduleTransformer } from "../transformers/RedditCommunityMaterializedViewScheduleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMaterializedViewSchedulesScheduleId(props: {
  scheduleId: string;
}): Promise<IRedditCommunityMaterializedViewSchedule> {
  const schedule =
    await MyGlobal.prisma.reddit_community_materialized_view_schedules.findUnique(
      {
        where: { id: props.scheduleId },
        ...RedditCommunityMaterializedViewScheduleTransformer.select(),
      },
    );
  if (!schedule) throw new HttpException("Schedule not found", 404);
  return await RedditCommunityMaterializedViewScheduleTransformer.transform(
    schedule,
  );
}
