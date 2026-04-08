import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunitiesCommunityIdFeeds(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const cursor = props.body.cursor;
  const whereInput: Prisma.reddit_like_postsWhereInput = {
    reddit_like_community_id: props.communityId,
    deleted_at: null,
  };
  if (props.body.sort === "top" && props.body.time_filter) {
    const now = new Date();
    let fromDate: string;
    switch (props.body.time_filter) {
      case "today":
        fromDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString();
        break;
      case "week":
        fromDate = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "month":
        fromDate = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "year":
        fromDate = new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "all_time":
      default:
        fromDate = new Date(0).toISOString();
        break;
    }
    whereInput.created_at = { gte: fromDate };
  }
  const orderByInput: Prisma.reddit_like_postsOrderByWithRelationInput[] = [];
  switch (props.body.sort) {
    case "hot":
      orderByInput.push({ created_at: "desc" as const });
      break;
    case "new":
      orderByInput.push({ created_at: "desc" as const });
      break;
    case "top":
      orderByInput.push({ created_at: "desc" as const });
      break;
    case "controversial":
      orderByInput.push({ created_at: "desc" as const });
      break;
    default:
      orderByInput.push({ created_at: "desc" as const });
      break;
  }
  let cursorInput:
    | {
        created_at: string;
        id: string;
      }
    | undefined;
  if (cursor) {
    try {
      const decoded = JSON.parse(atob(cursor));
      cursorInput = {
        created_at: decoded.created_at,
        id: decoded.id,
      };
    } catch {
      cursorInput = undefined;
    }
  }
  const records = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    ...(cursorInput ? { cursor: cursorInput, skip: 1 } : {}),
    take: limit + 1,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  const hasNext = records.length > limit;
  if (hasNext) {
    records.pop();
  }
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikePostAtSummaryTransformer.transform,
  );
  let nextCursor: string | undefined;
  if (hasNext && records.length > 0) {
    const last = records[records.length - 1];
    nextCursor = btoa(
      JSON.stringify({
        created_at: last.created_at,
        id: last.id,
      }),
    );
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditLikePost.ISummary;
}
