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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentVoteOfModeratorTransformer } from "../transformers/CommunityPlatformCommentVoteOfModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommentVotesModeratorsCommentVoteId(props: {
  moderator: ModeratorPayload;
  commentVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteOfModerator.IUpdate;
}): Promise<ICommunityPlatformCommentVoteOfModerator> {
  const existing =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.findUnique(
      {
        where: { id: props.commentVoteId },
        select: { id: true, vote: true, deleted_at: true, moderator_id: true },
      },
    );
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (existing.moderator_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.vote !== 1 && props.body.vote !== -1) {
    throw new HttpException("Invalid vote value", 400);
  }
  // ISO string timestamp for updated_at
  const updatedAtISOString = new Date().toISOString() as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.community_platform_comment_vote_of_moderators.update({
    where: { id: props.commentVoteId },
    data: { vote: props.body.vote, updated_at: new Date() }, // changed in next step
  });
  // Fetch updated record and transform
  const updated =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        ...CommunityPlatformCommentVoteOfModeratorTransformer.select(),
      },
    );
  return await CommunityPlatformCommentVoteOfModeratorTransformer.transform(
    updated,
  );
}
