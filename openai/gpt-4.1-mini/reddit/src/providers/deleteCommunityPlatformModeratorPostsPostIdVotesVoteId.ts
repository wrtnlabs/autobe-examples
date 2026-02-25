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

export async function deleteCommunityPlatformModeratorPostsPostIdVotesVoteId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote record by voteId
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: { id: true, post_id: true, post: { select: { id: true } } },
    });
  // Check if vote post_id matches the postId parameter
  if (vote.post_id !== props.postId) {
    throw new HttpException("Vote does not belong to the specified post", 404);
  }
  // Authorization check: the moderator is authorized as per caller context
  // We assume moderator authorization handled upstream; here just proceed
  // Delete the vote
  await MyGlobal.prisma.community_platform_post_votes.delete({
    where: { id: props.voteId },
  });
  // No content to return
}
