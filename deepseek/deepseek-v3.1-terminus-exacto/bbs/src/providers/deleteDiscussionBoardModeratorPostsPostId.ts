import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPost> {
  // First verify the post exists and get its details
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: props.postId },
    include: {
      channel: true,
      section: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Verify the post is not already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post has already been deleted", 400);
  }

  // Moderators have permission to delete any post, no additional checks needed

  // Perform the hard delete operation
  const deletedPost = await MyGlobal.prisma.discussion_board_posts.delete({
    where: { id: props.postId },
    include: {
      channel: true,
      section: true,
    },
  });

  // Convert the deleted post to the expected return type
  return {
    id: deletedPost.id,
    title: deletedPost.title,
    content: deletedPost.content,
    status: deletedPost.status,
    is_pinned: deletedPost.is_pinned,
    is_locked: deletedPost.is_locked,
    created_at: toISOStringSafe(deletedPost.created_at),
    updated_at: toISOStringSafe(deletedPost.updated_at),
    published_at: deletedPost.published_at
      ? toISOStringSafe(deletedPost.published_at)
      : undefined,
    archived_at: deletedPost.archived_at
      ? toISOStringSafe(deletedPost.archived_at)
      : undefined,
    deleted_at: deletedPost.deleted_at
      ? toISOStringSafe(deletedPost.deleted_at)
      : undefined,
    channel: {
      id: deletedPost.channel.id,
      name: deletedPost.channel.name,
      description: deletedPost.channel.description,
      status: deletedPost.channel.status,
      created_at: toISOStringSafe(deletedPost.channel.created_at),
    },
    section: {
      id: deletedPost.section.id,
      name: deletedPost.section.name,
      description: deletedPost.section.description,
      status: deletedPost.section.status,
      channel: {
        id: deletedPost.channel.id,
        name: deletedPost.channel.name,
        description: deletedPost.channel.description,
        status: deletedPost.channel.status,
        created_at: toISOStringSafe(deletedPost.channel.created_at),
      },
      created_at: toISOStringSafe(deletedPost.section.created_at),
      updated_at: toISOStringSafe(deletedPost.section.updated_at),
      deleted_at: deletedPost.section.deleted_at
        ? toISOStringSafe(deletedPost.section.deleted_at)
        : undefined,
    },
  };
}
