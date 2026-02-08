import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorCommentsCommentId(props: {
  moderator: ModeratorPayload;
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
    },
  });
  if (comment === null) throw new HttpException("Comment not found", 404);
  const author = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: comment.user_id },
    select: {
      id: true,
      display_name: true,
      bio: true,
      avatar_url: true,
    },
  });
  if (author === null) throw new HttpException("Author not found", 404);
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.post_id },
    select: {
      id: true,
      title: true,
    },
  });
  if (post === null) throw new HttpException("Post not found", 404);
  const parent = comment.parent_id
    ? await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: comment.parent_id },
        select: {
          id: true,
          content: true,
        },
      })
    : null;
  const children = await MyGlobal.prisma.community_platform_comments.findMany({
    where: { parent_id: comment.id },
    select: {
      id: true,
      content: true,
      created_at: true,
    },
    orderBy: { created_at: "asc" },
  });
  return {
    id: comment.id,
    content: comment.content,
    is_deleted: comment.is_deleted,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null ? null : toISOStringSafe(comment.deleted_at),
    author: {
      id: author.id,
      display_name: author.display_name,
      bio: author.bio === null ? undefined : author.bio,
      avatar_url: author.avatar_url === null ? undefined : author.avatar_url,
    },
    post: {
      id: post.id,
      title: post.title,
    },
    parent: parent === null ? null : { id: parent.id, content: parent.content },
    children: children.map((child) => ({
      id: child.id,
      content: child.content,
      created_at: toISOStringSafe(child.created_at),
    })),
  };
}
