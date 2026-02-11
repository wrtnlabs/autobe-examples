import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityMaterializedViewScheduleAtSummaryTransformer } from "../transformers/RedditCommunityMaterializedViewScheduleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMaterializedViewSchedules(props: {
  body: IRedditCommunityMaterializedViewSchedule.IRequest;
}): Promise<IRedditCommunityMaterializedViewSchedule.ISummary> {
  const { view_names, status } = props.body;
  // Validate status is exactly 'running'
  if (status !== "running") {
    throw new HttpException('Status must be "running"', 400);
  }
  // Fetch existing records to validate view_names and get refresh_interval
  const existing =
    await MyGlobal.prisma.reddit_community_materialized_view_schedules.findMany(
      {
        where: {
          view_name: { in: view_names },
          deleted_at: null,
        },
        select: {
          id: true,
          view_name: true,
          refresh_interval: true,
          next_refresh: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  // Verify all requested view_names exist
  const existingViewNames = new Set(existing.map((v) => v.view_name));
  const missingViews = view_names.filter((v) => !existingViewNames.has(v));
  if (missingViews.length > 0) {
    throw new HttpException(
      `Invalid view names: ${missingViews.join(", ")}`,
      404,
    );
  }
  // Compute next_refresh values in memory as string & tags.Format<'date-time'>
  const now = new Date().getTime();
  const updates = existing.map((record) => ({
    where: { id: record.id },
    data: {
      status: "running" as const,
      next_refresh: toISOStringSafe(
        new Date(now + record.refresh_interval * 1000),
      ),
    },
  }));
  // Execute bulk update with individual record updates using transaction
  const updated = await MyGlobal.prisma.$transaction(
    updates.map((update) =>
      MyGlobal.prisma.reddit_community_materialized_view_schedules.update(
        update,
      ),
    ),
  );
  // Return transformed summaries using preloaded transformer
  const summaries = await ArrayUtil.asyncMap(
    updated,
    RedditCommunityMaterializedViewScheduleAtSummaryTransformer.transform,
  );
  // Return the first summary as required by function signature
  if (summaries.length === 0) {
    throw new HttpException("No records updated", 404);
  }
  return summaries[0];
}
