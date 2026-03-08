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

export async function patchRedditLikePosts(props: {
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.author_id && { author_id: props.body.author_id }),
    ...(props.body.created_from && {
      created_at: { gte: props.body.created_from },
    }),
    ...(props.body.created_to && { created_at: { lt: props.body.created_to } }),
  } satisfies Prisma.reddit_like_postsWhereInput;
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput =
    ((): Prisma.reddit_like_postsOrderByWithRelationInput => {
      switch (props.body.sort) {
        case "new":
          return { created_at: "desc" as const };
        case "top":
          return { score: "desc" as const };
        case "controversial":
          return { score: "desc" as const };
        case "hot":
        default:
          return { created_at: "desc" as const };
      }
    })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...RedditLikePostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_posts.count({ where }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditLikePostAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
