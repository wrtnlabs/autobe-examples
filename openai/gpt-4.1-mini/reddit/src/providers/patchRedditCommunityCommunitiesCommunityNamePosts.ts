import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";

export async function patchRedditCommunityCommunitiesCommunityNamePosts(props: {
  communityName: string;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const { communityName, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true, name: true },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    reddit_community_community_id: community.id,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && { reddit_community_user_id: body.author_id }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { title: { contains: body.search } },
          { body: { contains: body.search } },
        ],
      }),
    ...(((body.created_at_from !== undefined &&
      body.created_at_from !== null) ||
      (body.created_at_to !== undefined && body.created_at_to !== null)) && {
      created_at: {
        ...(body.created_at_from !== undefined &&
          body.created_at_from !== null && { gte: body.created_at_from }),
        ...(body.created_at_to !== undefined &&
          body.created_at_to !== null && { lte: body.created_at_to }),
      },
    }),
  };

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        created_at: true,
        author: {
          select: {
            id: true,
            email: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        contentType: {
          select: {
            id: true,
            content_type_code: true,
            content_type_name: true,
            description: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where }),
  ]);

  const summaries = posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    author: {
      id: post.author.id,
      email: post.author.email,
    },
    community: {
      id: post.community.id,
      name: post.community.name,
    },
    content_type: {
      id: post.contentType.id,
      content_type_code: post.contentType.content_type_code,
      content_type_name: post.contentType.content_type_name,
      description: post.contentType.description ?? null,
    },
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
