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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPostsPopular(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortMethod = "hot" as "hot" | "new" | "top" | "controversial";
  const timeFilter = "all" as
    | "all"
    | "today"
    | "this_week"
    | "this_month"
    | "this_year";
  // Build where conditions
  const whereConditions: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
  };
  // Build order by conditions
  let orderByInput:
    | Prisma.reddit_like_postsOrderByWithRelationInput
    | Prisma.reddit_like_postsOrderByWithRelationInput[];
  switch (sortMethod) {
    case "hot":
      orderByInput = {
        score: "desc",
        created_at: "desc",
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
    case "new":
      orderByInput = {
        created_at: "desc",
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
    case "top":
      orderByInput = {
        score: "desc",
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
    case "controversial":
      orderByInput = {
        score: "desc",
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
    default:
      orderByInput = {
        score: "desc",
        created_at: "desc",
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
  }
  // Apply time filter for top sorting
  if (sortMethod === "top" && timeFilter !== "all") {
    const now = new Date();
    let timeAgo: Date;
    switch (timeFilter) {
      case "today":
        timeAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this_week":
        timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "this_month":
        timeAgo = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
        break;
      case "this_year":
        timeAgo = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        timeAgo = new Date(0);
    }
    whereConditions.created_at = {
      gte: timeAgo,
    };
  }
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditLikePostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_posts.count({
      where: whereConditions,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
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
