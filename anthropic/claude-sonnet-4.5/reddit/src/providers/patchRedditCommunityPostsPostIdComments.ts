import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";

export async function patchRedditCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        reddit_community_post_id: props.postId,
        ...(props.body.search && {
          body: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        created_at:
          props.body.sort === "old"
            ? Prisma.SortOrder.asc
            : Prisma.SortOrder.desc,
      },
      include: {
        author: true,
        post: {
          include: {
            author: true,
            community: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: {
        reddit_community_post_id: props.postId,
        ...(props.body.search && {
          body: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((comment) => ({
      id: comment.id,
      body: comment.body,
      depth: comment.depth,
      edited: comment.edited,
      created_at: toISOStringSafe(comment.created_at),
      author: {
        id: comment.author.id,
        username: comment.author.username,
        display_name:
          comment.author.display_name === null
            ? undefined
            : comment.author.display_name,
        bio: comment.author.bio === null ? undefined : comment.author.bio,
        avatar_url:
          comment.author.avatar_url === null
            ? undefined
            : comment.author.avatar_url,
        post_karma: comment.author.post_karma,
        comment_karma: comment.author.comment_karma,
        created_at: toISOStringSafe(comment.author.created_at),
      },
      post: {
        id: comment.post.id,
        title: comment.post.title,
        post_type: comment.post.post_type as "text" | "link" | "image",
        vote_score: 0,
        comment_count: 0,
        edited: comment.post.edited,
        created_at: toISOStringSafe(comment.post.created_at),
        author: {
          id: comment.post.author.id,
          username: comment.post.author.username,
          display_name:
            comment.post.author.display_name === null
              ? undefined
              : comment.post.author.display_name,
          bio:
            comment.post.author.bio === null
              ? undefined
              : comment.post.author.bio,
          avatar_url:
            comment.post.author.avatar_url === null
              ? undefined
              : comment.post.author.avatar_url,
          post_karma: comment.post.author.post_karma,
          comment_karma: comment.post.author.comment_karma,
          created_at: toISOStringSafe(comment.post.author.created_at),
        },
        community: {
          id: comment.post.community.id,
          name: comment.post.community.name,
          display_title: comment.post.community.display_title,
          description: comment.post.community.description,
          icon_url:
            comment.post.community.icon_url === null
              ? undefined
              : comment.post.community.icon_url,
          banner_url:
            comment.post.community.banner_url === null
              ? undefined
              : comment.post.community.banner_url,
          subscriber_count: comment.post.community.subscriber_count,
          post_count: comment.post.community.post_count,
          created_at: toISOStringSafe(comment.post.community.created_at),
        },
      },
    })),
  };
}
