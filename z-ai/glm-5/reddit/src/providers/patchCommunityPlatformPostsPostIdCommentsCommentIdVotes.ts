import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdCommentsCommentIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify comment exists and belongs to post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  // NOTE: Member ID should come from authentication middleware
  // This implementation assumes member authentication will be added
  throw new HttpException("Authentication required", 401);
}
