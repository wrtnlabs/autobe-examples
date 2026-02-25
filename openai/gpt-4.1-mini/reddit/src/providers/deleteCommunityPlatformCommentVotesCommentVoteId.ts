import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformCommentVotesCommentVoteId(props: {
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the comment vote from the database or throw 404 if not found
  const commentVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.commentVoteId },
      select: { id: true, community_platform_comment_id: true },
    });
  // No user authorization info provided in props to verify ownership or moderator/admin
  // For this implementation, proceed to delete directly.
  await MyGlobal.prisma.community_platform_comment_votes.delete({
    where: { id: props.commentVoteId },
  });
}
