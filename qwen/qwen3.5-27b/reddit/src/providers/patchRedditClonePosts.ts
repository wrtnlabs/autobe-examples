import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePosts(props: {
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.feed_type === "community" && props.body.community_id) {
    whereInput.reddit_clone_community_id = props.body.community_id;
  }
  if (props.body.post_type) {
    whereInput.post_type = props.body.post_type;
  }
  if (props.body.author_id) {
    whereInput.reddit_clone_members_id = props.body.author_id;
  }
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  if (props.body.search) {
    whereInput.OR = [
      { title: { contains: props.body.search } },
      { content: { contains: props.body.search } },
    ];
  }
  let orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput;
  if (props.body.sort === "new") {
    orderByInput = { created_at: "desc" };
  } else if (props.body.sort === "top") {
    orderByInput = { score: "desc" };
    if (props.body.time_filter && props.body.time_filter !== "all_time") {
      const now = new Date();
      let timeAgo: Date;
      switch (props.body.time_filter) {
        case "today":
          timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          timeAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeAgo = now;
      }
      if (whereInput.created_at && typeof whereInput.created_at === "object") {
        (whereInput.created_at as Prisma.DateTimeFilter).gte = timeAgo;
      } else {
        whereInput.created_at = { gte: timeAgo };
      }
    }
  } else if (props.body.sort === "controversial") {
    orderByInput = { score: "desc" };
  } else {
    orderByInput = { created_at: "desc" };
  }
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditClonePostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
