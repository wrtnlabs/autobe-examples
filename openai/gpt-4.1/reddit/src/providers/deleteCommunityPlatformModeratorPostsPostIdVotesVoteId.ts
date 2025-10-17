import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorPostsPostIdVotesVoteId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the vote, sanity check post match & not deleted
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.voteId },
  });
  if (!vote || vote.deleted_at !== null) {
    throw new HttpException("Vote not found or already deleted", 404);
  }
  if (vote.community_platform_post_id !== props.postId) {
    throw new HttpException("Vote does not belong to the specified post", 400);
  }

  // Fetch post (for community validation)
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Moderator must be active, assigned to this community
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: post.community_platform_community_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Unauthorized: Moderator not assigned to this community",
      403,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: props.voteId },
    data: { deleted_at: now, updated_at: now },
  });

  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "moderator",
      actor_id: props.moderator.id,
      action_type: "delete",
      target_table: "community_platform_post_votes",
      target_id: props.voteId,
      details: JSON.stringify({ postId: props.postId }),
      created_at: now,
    },
  });
  // Post score/karma recompute hooks are outside the scope of this provider.
}
