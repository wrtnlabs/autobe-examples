import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformPostsPostIdCommentsCommentIdReplies(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // First, verify the comment exists and belongs to the specified post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
      },
      select: {
        id: true,
        community_platform_user_id: true,
        is_deleted: true,
      },
    });
  // Check if comment is soft-deleted
  if (comment.is_deleted) {
    throw new HttpException("Comment has been deleted", 404);
  }
  // Note: User authentication/authorization is assumed to be handled at the controller level
  // The function should receive user context through other means (request context)
  // For now, we'll proceed with the update assuming proper authorization
  // Update the comment content
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        content: props.body.content,
        updated_at: new Date(),
      },
      ...CommunityPlatformCommentTransformer.select(),
    });
  return await CommunityPlatformCommentTransformer.transform(updatedComment);
}
