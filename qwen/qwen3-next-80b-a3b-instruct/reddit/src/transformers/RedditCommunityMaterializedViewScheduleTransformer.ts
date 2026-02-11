import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMaterializedViewScheduleTransformer {
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
        last_refresh: true,
        next_refresh: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_materialized_view_schedulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMaterializedViewSchedule> {
    return {
      id: input.id,
      view_name: input.view_name,
      refresh_interval: input.refresh_interval,
      last_refresh: input.last_refresh.toISOString(),
      next_refresh: input.next_refresh.toISOString(),
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
