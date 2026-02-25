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

export async function getCommunityPlatformModeratorPostVotesModeratorsPostVoteId(props: {
  moderator: ModeratorPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteOfModerator> {
  await MyGlobal.prisma.community_platform_moderators.findFirstOrThrow({
    where: {
      id: props.moderator.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const vote =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findUnique(
      {
        where: { id: props.postVoteId },
        ...CommunityPlatformPostVoteOfModeratorTransformer.select(),
      },
    );
  if (vote === null || vote.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformPostVoteOfModeratorTransformer.transform(vote);
}
