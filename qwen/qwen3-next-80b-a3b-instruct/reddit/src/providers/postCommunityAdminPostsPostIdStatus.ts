import { ICommunityPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postCommunityAdminPostsPostIdStatus(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPostStatus;
}): Promise<void> {
  // Find the post_status record matching the requested status
  const postStatusRecord =
    await MyGlobal.prisma.community_post_statuses.findFirst({
      where: { status: props.body as string },
    });
  if (!postStatusRecord) {
    throw new HttpException("Invalid post status", 400);
  }
  // Find the current post
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // If the post is already in this status, reject
  if (post.community_post_status_id === postStatusRecord.id) {
    return; // Already in target status - no-op
  }
  // Update the post to reference the correct post_status_id
  await MyGlobal.prisma.community_posts.update({
    where: { id: props.postId },
    data: {
      community_post_status_id: postStatusRecord.id,
    },
  });
  // Log the moderation action
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_audit_logs.create({
    data: {
      id: v4(),
      action_type: "UPDATE_STATUS",
      target_type: "POST",
      target_id: props.postId,
      moderator_id: props.admin.id,
      created_at: now,
      updated_at: now,
      description: `Status changed to ${props.body} by admin ${props.admin.id}`,
    },
  });
}
