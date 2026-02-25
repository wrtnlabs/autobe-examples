import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentVoteScoreTransformer } from "../transformers/CommunityPlatformCommentVoteScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformAdminCommentsCommentIdVoteScore(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteScore> {
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
