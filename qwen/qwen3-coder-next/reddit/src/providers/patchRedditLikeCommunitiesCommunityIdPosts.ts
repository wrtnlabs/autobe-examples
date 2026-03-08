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

export async function patchRedditLikeCommunitiesCommunityIdPosts(props: {
  communityId: string;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_like_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  // Build order by clause based on sort parameter
  let orderBy:
    | Prisma.reddit_like_postsOrderByWithRelationInput
    | Prisma.reddit_like_postsOrderByWithRelationInput[] = [];
  switch (props.body.sort) {
    case "hot":
      orderBy = { score: "desc" as const, created_at: "desc" as const };
      break;
    case "new":
      orderBy = { created_at: "desc" as const };
      break;
    case "top":
      orderBy = { score: "desc" as const };
      break;
    case "controversial":
      orderBy = [{ score: "desc" as const }, { created_at: "desc" as const }];
      break;
    default:
      orderBy = { created_at: "desc" as const };
      break;
  }
  // Execute query with pagination
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_posts.count({ where });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  // Build response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: data,
  };
}
