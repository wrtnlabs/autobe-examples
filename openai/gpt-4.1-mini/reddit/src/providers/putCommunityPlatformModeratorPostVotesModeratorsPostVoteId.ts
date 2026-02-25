import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostVoteOfModeratorTransformer } from "../transformers/CommunityPlatformPostVoteOfModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorPostVotesModeratorsPostVoteId(props: {
  moderator: ModeratorPayload;
  postVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVoteOfModerator.IUpdate;
}): Promise<ICommunityPlatformPostVoteOfModerator> {
  const allowedVoteTypes = ["upvote", "downvote"];
  if (!allowedVoteTypes.includes(props.body.vote_type)) {
    throw new HttpException("Invalid vote_type", 400);
  }
  const existing =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findUniqueOrThrow(
      {
        where: { id: props.postVoteId },
        select: { community_platform_moderator_id: true },
      },
    );
  if (existing.community_platform_moderator_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.community_platform_post_vote_of_moderators.update({
    where: { id: props.postVoteId },
    data: {
      vote_type: props.body.vote_type,
      updated_at: updatedAt,
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findUniqueOrThrow(
      {
        where: { id: props.postVoteId },
        ...CommunityPlatformPostVoteOfModeratorTransformer.select(),
      },
    );
  return await CommunityPlatformPostVoteOfModeratorTransformer.transform(
    updated,
  );
}
