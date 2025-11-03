import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserPostVotesPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // Step 1: Fetch the vote
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
  });
  if (!vote) throw new HttpException("Vote not found", 404);
  // Step 2: Verify user owns the vote
  if (vote.community_platform_user_id !== props.user.id) {
    throw new HttpException("Forbidden: This vote does not belong to you", 403);
  }
  // Step 3: Fetch the post and check for soft/hard deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: vote.community_platform_post_id },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.deleted_at) {
    throw new HttpException("Cannot vote on deleted post", 403);
  }
  // Step 4: Prepare update payload
  const now = toISOStringSafe(new Date());
  let updated;
  if (typeof props.body.is_upvote === "boolean") {
    // Toggle (upvote or downvote)
    updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.postVoteId },
      data: {
        is_upvote: props.body.is_upvote,
        updated_at: now,
        deleted_at: null,
      },
    });
  } else {
    // Removal (no is_upvote field means mark deleted)
    updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.postVoteId },
      data: {
        updated_at: now,
        deleted_at: now,
      },
    });
  }
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    community_platform_post_id: updated.community_platform_post_id,
    is_upvote: updated.is_upvote,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
