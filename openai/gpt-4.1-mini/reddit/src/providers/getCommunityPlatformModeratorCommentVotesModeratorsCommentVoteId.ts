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

export async function getCommunityPlatformModeratorCommentVotesModeratorsCommentVoteId(props: {
  moderator: ModeratorPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteOfModerator> {
  const record =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        ...CommunityPlatformCommentVoteOfModeratorTransformer.select(),
      },
    );
  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformCommentVoteOfModeratorTransformer.transform(
    record,
  );
}
