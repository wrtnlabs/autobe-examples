import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPosts(props: {
  admin: AdminPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  if (
    props.body.feed !== undefined &&
    props.body.feed !== "home" &&
    props.body.feed !== "popular" &&
    props.body.feed !== "community"
  ) {
    throw new HttpException("Unsupported feed scope", 400);
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "hot" &&
    props.body.sort !== "new" &&
    props.body.sort !== "top" &&
    props.body.sort !== "controversial"
  ) {
    throw new HttpException("Unsupported sort mode", 400);
  }
  if (
    props.body.topWindow !== undefined &&
    props.body.topWindow !== "today" &&
    props.body.topWindow !== "week" &&
    props.body.topWindow !== "month" &&
    props.body.topWindow !== "year" &&
    props.body.topWindow !== "all"
  ) {
    throw new HttpException("Unsupported top window", 400);
  }
  const where: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.communityId !== undefined
      ? { community_platform_community_id: props.body.communityId }
      : {}),
    ...(props.body.communityName !== undefined
      ? { community: { name: props.body.communityName } }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [{ title: { contains: props.body.search, mode: "insensitive" } }],
        }
      : {}),
  };
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput[] =
    props.body.sort === "top"
      ? [{ created_at: "desc" }, { id: "desc" }]
      : props.body.sort === "controversial"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "hot"
          ? [{ created_at: "desc" }, { id: "desc" }]
          : [{ created_at: "desc" }, { id: "desc" }];
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      status: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_image_uri: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total: number = await MyGlobal.prisma.community_platform_posts.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      async (post) =>
        ({
          id: post.id,
          title: post.title,
          status: post.status,
          author: {
            id: post.author.id,
            email: post.author.email,
            username: post.author.username,
            displayName: post.author.display_name,
            bio: post.author.bio,
            avatarImageUri: post.author.avatar_image_uri,
            karma: post.author.karma,
            createdAt: post.author.created_at.toISOString(),
            updatedAt: post.author.updated_at.toISOString(),
            deletedAt: post.author.deleted_at?.toISOString() ?? null,
          } satisfies ICommunityPlatformMember.ISummary,
          community:
            await CommunityPlatformCommunityAtSummaryTransformer.transform(
              post.community,
            ),
          voteScore: 0,
          commentCount: 0,
          createdAt: post.created_at.toISOString(),
          updatedAt: post.updated_at.toISOString(),
          deletedAt: post.deleted_at?.toISOString() ?? null,
        }) satisfies ICommunityPlatformPost.ISummary,
    ),
  };
}
