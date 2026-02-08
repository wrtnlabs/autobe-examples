import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      user_id: true,
      post_id: true,
      parent_id: true,
      content: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
      parent: {
        select: {
          id: true,
          user_id: true,
          post_id: true,
          parent_id: true,
          content: true,
          is_deleted: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      children: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  return {
    id: comment.id,
    user_id: comment.user_id,
    post_id: comment.post_id,
    parent_id: comment.parent_id === null ? undefined : comment.parent_id,
    content: comment.content,
    is_deleted: comment.is_deleted,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null ? null : toISOStringSafe(comment.deleted_at),
    user: {
      id: comment.user.id,
      email: comment.user.email,
      username: comment.user.username,
      display_name: comment.user.display_name,
      avatar_url:
        comment.user.avatar_url === null ? undefined : comment.user.avatar_url,
    },
    post: {
      id: comment.post.id,
      title: comment.post.title,
    },
    parent:
      comment.parent === null
        ? undefined
        : {
            id: comment.parent.id,
            user_id: comment.parent.user_id,
            post_id: comment.parent.post_id,
            parent_id:
              comment.parent.parent_id === null
                ? undefined
                : comment.parent.parent_id,
            content: comment.parent.content,
            is_deleted: comment.parent.is_deleted,
            created_at: toISOStringSafe(comment.parent.created_at),
            updated_at: toISOStringSafe(comment.parent.updated_at),
            deleted_at:
              comment.parent.deleted_at === null
                ? null
                : toISOStringSafe(comment.parent.deleted_at),
          },
    children: comment.children.map((child) => ({
      id: child.id,
      content: child.content,
    })),
  };
}
