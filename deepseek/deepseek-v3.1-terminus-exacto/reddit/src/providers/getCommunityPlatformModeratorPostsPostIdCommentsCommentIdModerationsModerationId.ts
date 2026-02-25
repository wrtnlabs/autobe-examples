import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentModerationTransformer } from "../transformers/CommunityPlatformCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostIdCommentsCommentIdModerationsModerationId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentModeration> {
  // First, verify the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, community_platform_post_id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Retrieve the moderation record with full transformer select
  const moderationRecord =
    await MyGlobal.prisma.community_platform_comment_moderations.findUnique({
      where: { id: props.moderationId },
      ...CommunityPlatformCommentModerationTransformer.select(),
    });
  if (!moderationRecord) {
    throw new HttpException("Moderation record not found", 404);
  }
  // Validate that the moderation record belongs to the specified comment
  if (moderationRecord.comment.id !== props.commentId) {
    throw new HttpException(
      "Moderation record does not belong to the specified comment",
      400,
    );
  }
  return await CommunityPlatformCommentModerationTransformer.transform(
    moderationRecord,
  );
}
