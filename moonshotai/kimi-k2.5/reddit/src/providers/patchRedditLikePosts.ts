import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
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

export async function patchRedditLikePosts(props: {
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Calculate time filter date range
  let timeFilterStart: Date | undefined;
  if (props.body.timeFilter && props.body.timeFilter !== "all_time") {
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        timeFilterStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeFilterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeFilterStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
  }
  // Build where conditions
  const where: Prisma.reddit_like_postsWhereInput = {
    is_deleted: false,
    ...(props.body.search && {
      title: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.communityId && {
      community_id: props.body.communityId,
    }),
    ...(props.body.authorId && {
      author_id: props.body.authorId,
    }),
    ...(props.body.postType && {
      post_type: props.body.postType,
    }),
    ...(timeFilterStart && {
      created_at: {
        gte: timeFilterStart,
      },
    }),
    ...((props.body.createdAfter || props.body.createdBefore) && {
      created_at: {
        ...(props.body.createdAfter && {
          gte: new Date(props.body.createdAfter),
        }),
        ...(props.body.createdBefore && {
          lte: new Date(props.body.createdBefore),
        }),
      },
    }),
  };
  // Determine orderBy
  let orderBy: Prisma.reddit_like_postsOrderByWithRelationInput;
  if (props.body.sort === "new") {
    orderBy = { created_at: "desc" };
  } else if (props.body.sort === "top") {
    orderBy = { vote_score: "desc" };
  } else if (props.body.sortBy) {
    orderBy = { [props.body.sortBy]: props.body.sortOrder ?? "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...RedditLikePostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_posts.count({ where }),
  ]);
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
