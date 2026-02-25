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

export async function deleteCommunityPlatformModeratorCommentVotesModeratorsCommentVoteId(props: {
  moderator: ModeratorPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_vote_of_moderators.findFirst(
      {
        where: {
          id: props.commentVoteId,
          moderator_id: props.moderator.id,
          deleted_at: null,
        },
      },
    );
  if (vote === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_comment_vote_of_moderators.delete({
    where: { id: props.commentVoteId },
  });
}
