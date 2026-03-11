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

export async function patchRedditLikeMemberCommunitiesCommunityNamePosts(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.reddit_like_communities.findFirstOrThrow({
      where: { name: props.communityName, deleted_at: null },
      select: { id: true },
    });
  const whereInput: Prisma.reddit_like_postsWhereInput = {
    community_id: community.id,
    deleted_at: null,
    author: {
      deleted_at: null,
    },
    ...(props.body.title && {
      title: { contains: props.body.title },
    }),
    ...(props.body.content && {
      content: { contains: props.body.content },
    }),
    ...(props.body.type && {
      type: props.body.type,
    }),
  } satisfies Prisma.reddit_like_postsWhereInput;
  const orderByInput: Prisma.reddit_like_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikePostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
