import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconomicBoardAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicBoardPost.IUpdate;
}): Promise<IEconomicBoardPost> {
  // Fetch the post to verify existence and current status
  const post = await MyGlobal.prisma.economic_board_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });

  // Check if post is deleted - return 404 if so
  if (post.status === "deleted") {
    throw new HttpException("Post not found", 404);
  }

  // Prepare update data object
  const updateData: Partial<IEconomicBoardPost> = {};

  // Handle subject update if provided
  if (props.body.subject !== undefined) {
    updateData.subject = props.body.subject satisfies string | null as string;
    updateData.edited = true;
  }

  // Handle content update if provided
  if (props.body.content !== undefined) {
    updateData.content = props.body.content satisfies string | null as string;
    updateData.edited = true;
  }

  // If either subject or content was updated, set updated_at
  if (props.body.subject !== undefined || props.body.content !== undefined) {
    updateData.updated_at = toISOStringSafe(new Date());
  }

  // Update the post in database
  const updatedPost = await MyGlobal.prisma.economic_board_posts.update({
    where: { id: props.postId },
    data: updateData,
  });

  // Return the updated post with correct data types
  return {
    id: updatedPost.id,
    economic_board_topics_id: updatedPost.economic_board_topics_id,
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: toISOStringSafe(updatedPost.updated_at),
    status: updatedPost.status satisfies string as
      | "pending"
      | "published"
      | "rejected"
      | "deleted",
    subject: updatedPost.subject satisfies string | null as string,
    content: updatedPost.content satisfies string | null as string,
    reply_count: updatedPost.reply_count,
    edited: updatedPost.edited,
    edited_at: updatedPost.edited_at
      ? toISOStringSafe(updatedPost.edited_at)
      : undefined,
    author_hash: updatedPost.author_hash,
    admin_id: updatedPost.admin_id,
    moderation_reason: updatedPost.moderation_reason ?? null,
  } satisfies IEconomicBoardPost;
}
