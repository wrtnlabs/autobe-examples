import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFeedView";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneFeedViews(props: {
  body: IRedditCloneFeedView.IRequest;
}): Promise<IPageIRedditCloneFeedView> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_feed_viewsWhereInput = {
    deleted_at: null,
    ...(props.body.feed_config_id && {
      feed_config_id: props.body.feed_config_id,
    }),
    ...(props.body.cache_key && {
      cache_key: { equals: props.body.cache_key, mode: "insensitive" },
    }),
    ...(props.body.is_stale !== undefined && {
      is_stale: props.body.is_stale,
    }),
  } satisfies Prisma.reddit_clone_feed_viewsWhereInput;
  const orderByInput = (
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "updated_at"
        ? { updated_at: props.body.sort_order ?? "desc" }
        : props.body.sort_by === "last_refreshed_at"
          ? { last_refreshed_at: props.body.sort_order ?? "desc" }
          : props.body.sort_by === "cache_key"
            ? { cache_key: props.body.sort_order ?? "asc" }
            : { created_at: "desc" }
  ) satisfies Prisma.reddit_clone_feed_viewsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_feed_views.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      feed_config_id: true,
      cache_key: true,
      ttl_seconds: true,
      is_stale: true,
      last_refreshed_at: true,
      last_content_updated_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      feedConfig: {
        select: {
          id: true,
          default_sort_algorithm: true,
          default_time_filter: true,
          home_feed_requires_auth: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_feed_views.count({
    where: whereInput,
  });
  const mappedData: IRedditCloneFeedView[] = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    feed_config_id: record.feed_config_id as string & tags.Format<"uuid">,
    cache_key: record.cache_key,
    ttl_seconds: (record.ttl_seconds ?? 0) satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    is_stale: record.is_stale,
    last_refreshed_at: record.last_refreshed_at
      ? toISOStringSafe(record.last_refreshed_at)
      : null,
    last_content_updated_at: record.last_content_updated_at
      ? toISOStringSafe(record.last_content_updated_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    feedConfig: {
      users: {
        total: 0,
        members: 0,
        moderators: 0,
        owners: 0,
        active_24h: 0,
        active_7d: 0,
        active_30d: 0,
      },
      content: {
        posts: 0,
        comments: 0,
        votes: 0,
        votes_per_post: 0,
        comments_per_post: 0,
      },
      communities: {
        total: 0,
        new_24h: 0,
        new_7d: 0,
        subscribers_total: 0,
      },
      moderation: {
        reports_total: 0,
        reports_pending: 0,
        reports_approved: 0,
        reports_dismissed: 0,
        resolution_rate: 0,
        bans_total: 0,
        active_bans: 0,
        moderation_actions_total: 0,
      },
      karma: {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        users_with_karma: 0,
      },
      generated_at: toISOStringSafe(new Date()),
    } satisfies IRedditCloneFeedConfig.ISummary,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: mappedData,
  } satisfies IPageIRedditCloneFeedView;
}
