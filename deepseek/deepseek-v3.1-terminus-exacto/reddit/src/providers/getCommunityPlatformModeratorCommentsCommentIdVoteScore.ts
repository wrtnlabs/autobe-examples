import { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentVoteScoreTransformer } from "../transformers/CommunityPlatformCommentVoteScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorCommentsCommentIdVoteScore(props: {
  moderator: ModeratorPayload;
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
