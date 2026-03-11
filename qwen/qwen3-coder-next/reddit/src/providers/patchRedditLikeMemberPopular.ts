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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPopular(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(props.body.limit ?? 100, 100));
  const skip = (page - 1) * limit;
  let orderBy: any;
  let where: Prisma.reddit_like_postsWhereInput = { deleted_at: null };
  const sort = "hot";
  switch (sort) {
    case "hot":
    default:
      orderBy = [
        {
          _count: {
            votes: "desc",
          },
        },
        { score: "desc" },
        { created_at: "desc" },
      ];
      break;
  }
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      url: true,
      image_url: true,
      author_id: true,
      community_id: true,
      score: true,
      comment_count: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where,
  });
  // Fetch authors and communities in parallel
  const authorIds = Array.from(new Set(data.map((p) => p.author_id)));
  const communityIds = Array.from(new Set(data.map((p) => p.community_id)));
  const [authors, communities] = await Promise.all([
    authorIds.length > 0
      ? MyGlobal.prisma.reddit_like_members.findMany({
          where: { id: { in: authorIds } },
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        })
      : [],
    communityIds.length > 0
      ? MyGlobal.prisma.reddit_like_communities.findMany({
          where: { id: { in: communityIds } },
          select: {
            id: true,
            name: true,
            icon_url: true,
          },
        })
      : [],
  ]);
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]));
  const communityMap = Object.fromEntries(communities.map((c) => [c.id, c]));
  // Fetch subscriber counts for all communities
  const communitySubscriberCounts =
    await MyGlobal.prisma.reddit_like_subscriptions.groupBy({
      by: ["reddit_like_community_id"],
      where: { reddit_like_community_id: { in: communityIds } },
      _count: { reddit_like_community_id: true },
    });
  const subscriberCountMap = Object.fromEntries(
    communitySubscriberCounts.map((c) => [
      c.reddit_like_community_id,
      c._count.reddit_like_community_id,
    ]),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((post) => ({
      id: post.id,
      title: post.title,
      type: post.type as "text" | "link" | "image",
      content: post.content,
      url: post.url,
      imageUrl: post.image_url,
      author: {
        id: authorMap[post.author_id]?.id,
        username: authorMap[post.author_id]?.username,
        display_name: authorMap[post.author_id]?.display_name,
        bio: authorMap[post.author_id]?.bio,
        avatar_url: authorMap[post.author_id]?.avatar_url,
        karma_score: authorMap[post.author_id]?.karma_score,
        created_at: toISOStringSafe(authorMap[post.author_id]?.created_at),
      },
      community: {
        id: communityMap[post.community_id]?.id,
        name: communityMap[post.community_id]?.name,
        icon_url: communityMap[post.community_id]?.icon_url,
        subscriber_count: subscriberCountMap[post.community_id] ?? 0,
      },
      voteScore: post.score,
      commentCount: post.comment_count,
      createdAt: toISOStringSafe(post.created_at),
    })),
  };
}
