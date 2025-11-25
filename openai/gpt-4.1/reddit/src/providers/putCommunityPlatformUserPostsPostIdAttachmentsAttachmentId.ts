import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserPostsPostIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostAttachment.IUpdate;
}): Promise<ICommunityPlatformPostAttachment> {
  // Step 1: Validate attachment exists and belongs to the post
  const attachment =
    await MyGlobal.prisma.community_platform_post_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found.", 404);
  }
  if (attachment.post_id !== props.postId) {
    throw new HttpException(
      "Attachment does not belong to the specified post.",
      400,
    );
  }

  // Step 2: Check post ownership
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found.", 404);
  }
  if (post.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this attachment.",
      403,
    );
  }

  // Step 3: Update attachment metadata
  const updated =
    await MyGlobal.prisma.community_platform_post_attachments.update({
      where: { id: props.attachmentId },
      data: {
        uri: props.body.uri,
        mimetype: props.body.mimetype,
      },
    });

  // Step 4: Map to DTO
  return {
    id: updated.id,
    post_id: updated.post_id,
    uri: updated.uri,
    mimetype: updated.mimetype,
    created_at: toISOStringSafe(updated.created_at),
  };
}
