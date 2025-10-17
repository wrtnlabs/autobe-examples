import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchAdminPostsPostIdApprove(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardPosts> {
  const { admin, postId } = props;

  // Find the post and ensure it exists
  const post = await MyGlobal.prisma.economic_board_posts.findUniqueOrThrow({
    where: { id: postId },
  });

  // Verify post is in 'pending' status
  if (post.status !== "pending") {
    throw new HttpException("Post is not in pending status", 400);
  }

  // Update the post status to 'published', record admin, and update timestamp
  const updatedPost = await MyGlobal.prisma.economic_board_posts.update({
    where: { id: postId },
    data: {
      status: "published",
      admin_id: admin.id,
      moderation_reason: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Convert Prisma response object to IEconomicBoardPosts type
  // Explicitly convert Date fields to string using toISOStringSafe()
  return {
    id: updatedPost.id,
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: toISOStringSafe(updatedPost.updated_at),
    economic_board_topics_id: updatedPost.economic_board_topics_id,
    status: updatedPost.status as
      | "pending"
      | "published"
      | "rejected"
      | "deleted",
    subject: updatedPost.subject,
    content: updatedPost.content,
    reply_count: updatedPost.reply_count,
    edited: updatedPost.edited,
    edited_at: updatedPost.edited_at
      ? toISOStringSafe(updatedPost.edited_at)
      : null,
    author_hash: updatedPost.author_hash,
    admin_id: updatedPost.admin_id,
    moderation_reason: updatedPost.moderation_reason,
  } satisfies IEconomicBoardPosts;
}
