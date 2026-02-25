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
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // First, verify the comment exists and belongs to the authenticated user
  const existingComment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
        community_platform_user_id: props.user.id,
        is_deleted: false,
      },
      select: {
        id: true,
        created_at: true,
        community_platform_user_id: true,
      },
    });
  // Enforce the 1-hour edit window using proper date comparison
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (existingComment.created_at < oneHourAgo) {
    throw new HttpException(
      "Comment can only be edited within 1 hour of creation",
      403,
    );
  }
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
