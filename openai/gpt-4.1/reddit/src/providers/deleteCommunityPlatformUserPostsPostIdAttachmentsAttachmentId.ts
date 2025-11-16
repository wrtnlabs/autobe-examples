import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserPostsPostIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate the attachment exists and belongs to the specified post
  const attachment =
    await MyGlobal.prisma.community_platform_post_attachments.findUnique({
      where: { id: props.attachmentId },
    });

  if (!attachment || attachment.post_id !== props.postId) {
    throw new HttpException("Attachment not found for the given post.", 404);
  }

  // 2. Fetch the post to determine ownership
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found.", 404);
  }

  // 3. Check if the user is the post owner
  const isPostOwner = post.user_id === props.user.id;

  // 4. If not owner, verify moderator (not banned or soft-deleted)
  let isModerator = false;
  if (!isPostOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findUnique({
        where: { id: props.user.id },
      });
    if (
      moderator &&
      moderator.status !== "banned" &&
      moderator.deleted_at === null
    ) {
      isModerator = true;
    }
  }
  if (!isPostOwner && !isModerator) {
    throw new HttpException(
      "You are not authorized to delete this attachment.",
      403,
    );
  }

  // 5. Delete the attachment
  await MyGlobal.prisma.community_platform_post_attachments.delete({
    where: { id: props.attachmentId },
  });
}
