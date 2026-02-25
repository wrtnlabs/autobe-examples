import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorPostVotesModeratorsPostVoteId(props: {
  moderator: ModeratorPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_post_vote_of_moderators.findUniqueOrThrow(
    {
      where: { id: props.postVoteId },
    },
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_post_vote_of_moderators.delete({
      where: { id: props.postVoteId },
    });
    await tx.community_platform_moderation_logs.create({
      data: {
        id: v4(),
        moderator_id: props.moderator.id,
        action_type: "DeletePostVote",
        target_id: props.postVoteId,
        created_at: new Date().toISOString(),
      },
    });
  });
}
