import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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

export async function putRedditLikeMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IUpdate;
}): Promise<IRedditLikeComment> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author_id: true,
      post_id: true,
      parent_comment_id: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          url: true,
          image_url: true,
          type: true,
          score: true,
          comment_count: true,
          author_id: true,
          community_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              subscriber_count: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  if (comment.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const editWindowLimit = new Date(
    comment.created_at.getTime() + 5 * 60 * 1000,
  );
  if (editWindowLimit < new Date()) {
    throw new HttpException("Comment edit window expired", 403);
  }
  const updated = await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author_id: true,
      post_id: true,
      parent_comment_id: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          url: true,
          image_url: true,
          type: true,
          score: true,
          comment_count: true,
          author_id: true,
          community_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              subscriber_count: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  return {
    id: updated.id,
    content: updated.content,
    vote_score: updated.vote_score,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    author_id: updated.author_id,
    post_id: updated.post_id,
    parent_comment_id: updated.parent_comment_id,
    author: {
      id: updated.author.id,
      email: updated.author.email,
      username: updated.author.username,
      display_name: updated.author.display_name,
      bio: updated.author.bio,
      avatar_url: updated.author.avatar_url,
      karma_score: updated.author.karma_score,
      created_at: toISOStringSafe(updated.author.created_at),
      updated_at: toISOStringSafe(updated.author.updated_at),
      deleted_at: updated.author.deleted_at
        ? toISOStringSafe(updated.author.deleted_at)
        : null,
    },
    post: {
      id: updated.post.id,
      title: updated.post.title,
      content: updated.post.content,
      url: updated.post.url,
      image_url: updated.post.image_url,
      type: updated.post.type,
      score: updated.post.score,
      comment_count: updated.post.comment_count,
      author_id: updated.post.author_id,
      community_id: updated.post.community_id,
      created_at: toISOStringSafe(updated.post.created_at),
      updated_at: toISOStringSafe(updated.post.updated_at),
      deleted_at: updated.post.deleted_at
        ? toISOStringSafe(updated.post.deleted_at)
        : null,
      author: {
        id: updated.post.author.id,
        email: updated.post.author.email,
        username: updated.post.author.username,
        display_name: updated.post.author.display_name,
        bio: updated.post.author.bio,
        avatar_url: updated.post.author.avatar_url,
        karma_score: updated.post.author.karma_score,
        created_at: toISOStringSafe(updated.post.author.created_at),
        updated_at: toISOStringSafe(updated.post.author.updated_at),
        deleted_at: updated.post.author.deleted_at
          ? toISOStringSafe(updated.post.author.deleted_at)
          : null,
      },
      community: {
        id: updated.post.community.id,
        name: updated.post.community.name,
        description: updated.post.community.description,
        icon_url: updated.post.community.icon_url,
        subscriber_count: updated.post.community.subscriber_count,
        created_at: toISOStringSafe(updated.post.community.created_at),
        updated_at: toISOStringSafe(updated.post.community.updated_at),
        deleted_at: updated.post.community.deleted_at
          ? toISOStringSafe(updated.post.community.deleted_at)
          : null,
      },
    },
  };
}
