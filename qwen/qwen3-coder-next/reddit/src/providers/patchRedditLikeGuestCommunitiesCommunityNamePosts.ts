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
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestCommunitiesCommunityNamePosts(props: {
  guest: GuestPayload;
  communityName: string;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  const whereInput = {
    deleted_at: null,
    community_id: community.id,
    author: {
      deleted_at: null,
    },
    ...(props.body.title && {
      title: { contains: props.body.title },
    }),
  } satisfies Prisma.reddit_like_postsWhereInput;
  const orderByInput = { created_at: "desc" as const };
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (item) => {
      const transformed = {
        id: item.id,
        title: item.title,
        content: item.content,
        score: item.score,
        comment_count: item.comment_count,
        voteScore: item.score,
        commentCount: item.comment_count,
        createdAt: toISOStringSafe(item.created_at),
        type: item.type as "text" | "link" | "image" satisfies
          | "text"
          | "link"
          | "image",
        image_url: item.image_url,
        url: item.url,
        author: await RedditLikeMemberAtSummaryTransformer.transform(
          item.author,
        ),
        community: {
          name: community.name,
          icon_url: community.icon_url ?? null,
          subscriber_count: 0,
        } satisfies IRedditLikeCommunity.ISummary,
      };
      return transformed;
    }),
  } satisfies IPageIRedditLikePost.ISummary;
}
