import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // Step 1: Find the vote record, ensure valid and belongs to user
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.voteId },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.community_platform_member_id !== props.member.id) {
    throw new HttpException("You can only update your own vote", 403);
  }
  if (vote.community_platform_post_id !== props.postId) {
    throw new HttpException("Vote and post do not match", 400);
  }
  // Step 2: Find the post, ensure not deleted, not self-voting
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or already deleted", 404);
  }
  if (post.community_platform_member_id === props.member.id) {
    throw new HttpException("You cannot vote on your own post", 403);
  }
  // Step 3: Update or revoke
  let updated;
  if (props.body.vote_value === 0) {
    // Soft delete (revoke)
    const now = toISOStringSafe(new Date());
    updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.voteId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  } else {
    if (props.body.vote_value !== 1 && props.body.vote_value !== -1) {
      throw new HttpException("vote_value must be 1, -1, or 0", 400);
    }
    const now = toISOStringSafe(new Date());
    updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.voteId },
      data: {
        vote_value: props.body.vote_value,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    community_platform_member_id: updated.community_platform_member_id,
    vote_value: updated.vote_value as -1 | 1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
