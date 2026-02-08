import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserPostVotesPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
  });
  if (!vote) {
    throw new HttpException("Post vote not found", 404);
  }
  // Check if user is a community moderator
  const mod =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: { community_moderator_id: props.user.id, deleted_at: null },
    });
  // Check if user is a platform admin
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.user.id, deleted_at: null },
  });
  if (!mod && !admin) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_post_votes.delete({
    where: { id: props.postVoteId },
  });
  // Recalculate aggregated vote count for the related post
  const upvoteCount = await MyGlobal.prisma.community_platform_post_votes.count(
    {
      where: { post_id: vote.post_id, vote_type: "upvote", deleted_at: null },
    },
  );
  const downvoteCount =
    await MyGlobal.prisma.community_platform_post_votes.count({
      where: { post_id: vote.post_id, vote_type: "downvote", deleted_at: null },
    });
  // aggregated_vote_score column doesn't exist; skipping update
}
