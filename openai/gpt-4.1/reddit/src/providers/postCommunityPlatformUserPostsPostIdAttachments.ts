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

export async function postCommunityPlatformUserPostsPostIdAttachments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostAttachment.ICreate;
}): Promise<ICommunityPlatformPostAttachment> {
  // Step 1: Verify the parent post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, user_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Step 2: Verify user is the post owner
  if (post.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You do not have permission to add attachments to this post.",
      403,
    );
  }

  // Step 3: Create the attachment
  const now = toISOStringSafe(new Date());
  const newAttachment =
    await MyGlobal.prisma.community_platform_post_attachments.create({
      data: {
        id: v4(),
        post_id: props.postId,
        uri: props.body.uri,
        mimetype: props.body.mimetype,
        created_at: now,
      },
    });

  // Step 4: Return DTO-compliant attachment object
  return {
    id: newAttachment.id,
    post_id: newAttachment.post_id,
    uri: newAttachment.uri,
    mimetype: newAttachment.mimetype,
    created_at: toISOStringSafe(newAttachment.created_at),
  };
}
