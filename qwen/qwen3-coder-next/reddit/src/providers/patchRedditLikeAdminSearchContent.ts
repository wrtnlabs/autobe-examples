import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdminSearchContent(props: {
  admin: AdminPayload;
  body: IRedditLikeMember.IRequest;
}): Promise<IPageIRedditLikeMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      ...(props.body.search
        ? {
            OR: [
              {
                title: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
              {
                content: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      score: true,
      created_at: true,
    },
    skip,
    take: limit,
  });
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: {
      ...(props.body.search
        ? {
            OR: [
              {
                content: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      deleted_at: null,
    },
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
    },
    skip,
    take: limit,
  });
  const communities = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: {
      ...(props.body.search
        ? {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      created_at: true,
    },
    skip,
    take: limit,
  });
  // Count total records for pagination
  const totalPosts = await MyGlobal.prisma.reddit_like_posts.count({
    where: {
      ...(props.body.search
        ? {
            OR: [
              {
                title: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
              {
                content: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      deleted_at: null,
    },
  });
  const totalComments = await MyGlobal.prisma.reddit_like_comments.count({
    where: {
      ...(props.body.search
        ? {
            OR: [
              {
                content: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      deleted_at: null,
    },
  });
  const totalCommunities = await MyGlobal.prisma.reddit_like_communities.count({
    where: {
      ...(props.body.search
        ? {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      deleted_at: null,
    },
  });
  const totalRecords = totalPosts + totalComments + totalCommunities;
  // Transform results to IRedditLikeMember.ISummary format
  const transformPost = (post: any): IRedditLikeMember.ISummary => ({
    id: post.id as string & tags.Format<"uuid">,
    entity_type: "post" as const,
    title: post.title,
    content: (post.content || "").substring(0, 200),
    score: post.score,
    hit_count: 0,
    created_at: toISOStringSafe(post.created_at),
  });
  const transformComment = (comment: any): IRedditLikeMember.ISummary => ({
    id: comment.id as string & tags.Format<"uuid">,
    entity_type: "comment" as const,
    title: "",
    content: comment.content.substring(0, 200),
    score: comment.vote_score,
    hit_count: 0,
    created_at: toISOStringSafe(comment.created_at),
  });
  const transformCommunity = (community: any): IRedditLikeMember.ISummary => ({
    id: community.id as string & tags.Format<"uuid">,
    entity_type: "community" as const,
    title: community.name,
    content: "",
    score: 0,
    hit_count: 0,
    created_at: toISOStringSafe(community.created_at),
  });
  const data = [
    ...posts.map(transformPost),
    ...comments.map(transformComment),
    ...communities.map(transformCommunity),
  ];
  // Sort by creation date descending (newest first)
  const sortedData = data.sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data: sortedData,
  };
}
