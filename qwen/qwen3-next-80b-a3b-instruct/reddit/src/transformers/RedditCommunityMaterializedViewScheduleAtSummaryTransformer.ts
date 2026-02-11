import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMaterializedViewScheduleAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_community_materialized_view_schedulesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        view_name: true,
        refresh_interval: true,
        next_refresh: true,
        status: true,
        created_at: true,
        updated_at: true,
        last_refresh: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_materialized_view_schedulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMaterializedViewSchedule.ISummary> {
    return {
      id: input.id,
      view_name: input.view_name,
      refresh_interval: input.refresh_interval,
      next_refresh: toISOStringSafe(input.next_refresh),
      status: typia.assert<"scheduled" | "running" | "completed" | "failed">(
        input.status,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
