import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentVoteScoreTransformer } from "../transformers/CommunityPlatformCommentVoteScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommentsCommentIdVoteScore(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteScore> {
  // First, verify the comment exists and belongs to the current user
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.commentId,
      community_platform_user_id: props.user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (comment === null) {
    throw new HttpException("Comment not found or access denied", 404);
  }
  // Now find the vote score record for this comment
  const voteScore =
    await MyGlobal.prisma.community_platform_comment_vote_scores.findUniqueOrThrow(
      {
        where: {
          community_platform_comment_id: props.commentId,
        },
        ...CommunityPlatformCommentVoteScoreTransformer.select(),
      },
    );
  return await CommunityPlatformCommentVoteScoreTransformer.transform(
    voteScore,
  );
}
