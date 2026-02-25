import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentVoteOfModeratorCollector } from "../collectors/CommunityPlatformCommentVoteOfModeratorCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentVoteOfModeratorTransformer } from "../transformers/CommunityPlatformCommentVoteOfModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommentVotesModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentVoteOfModerator.ICreate;
}): Promise<ICommunityPlatformCommentVoteOfModerator> {
  const { moderator, body } = props;
  const commentVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: body.commentVoteId },
      select: { id: true },
    });
  if (commentVote === null) {
    throw new HttpException("Comment vote not found", 404);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingVote =
      await tx.community_platform_comment_vote_of_moderators.findUnique({
        where: {
          comment_vote_id_moderator_id: {
            comment_vote_id: body.commentVoteId,
            moderator_id: moderator.id,
          },
        },
      });
    if (existingVote !== null) {
      return await tx.community_platform_comment_vote_of_moderators.update({
        where: { id: existingVote.id },
        data: { vote: body.vote, updated_at: now },
        ...CommunityPlatformCommentVoteOfModeratorTransformer.select(),
      });
    } else {
      return await tx.community_platform_comment_vote_of_moderators.create({
        data: await CommunityPlatformCommentVoteOfModeratorCollector.collect({
          body,
          communityPlatformModerators: { id: moderator.id },
        }),
        ...CommunityPlatformCommentVoteOfModeratorTransformer.select(),
      });
    }
  });
  return await CommunityPlatformCommentVoteOfModeratorTransformer.transform(
    result,
  );
}
