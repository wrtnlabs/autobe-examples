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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPostsPopular(props: {
  guest: GuestPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
  };
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput = {
    score: "desc",
    created_at: "desc",
  };
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      url: true,
      image_url: true,
      score: true,
      comment_count: true,
      created_at: true,
      author_id: true,
      community_id: true,
      author: RedditLikeMemberAtSummaryTransformer.select(),
      community: RedditLikeCommunityAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where,
  });
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    const author = await RedditLikeMemberAtSummaryTransformer.transform(
      post.author,
    );
    const community = await RedditLikeCommunityAtSummaryTransformer.transform(
      post.community,
    );
    return {
      id: post.id,
      title: post.title,
      type: typia.assert<"text" | "link" | "image">(post.type),
      content: post.content ?? undefined,
      url: post.url ?? undefined,
      imageUrl: post.image_url ?? undefined,
      author,
      community,
      voteScore: post.score,
      commentCount: post.comment_count,
      createdAt: post.created_at.toISOString(),
    } satisfies IRedditLikePost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
