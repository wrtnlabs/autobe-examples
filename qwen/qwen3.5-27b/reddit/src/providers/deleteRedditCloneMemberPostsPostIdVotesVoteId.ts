import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query vote record with post relation
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      reddit_clone_post_id: true,
      reddit_clone_member_id: true,
      vote_type: true,
      deleted_at: true,
      post: {
        select: {
          id: true,
          deleted_at: true,
          reddit_clone_user_profile_id: true,
        },
      },
    },
  });
  // Verify vote is not already deleted
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  // Verify vote ownership
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify post exists and is not deleted
  if (vote.post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Verify vote-post relationship
  if (vote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Vote does not belong to the specified post", 400);
  }
  // Soft delete the vote
  await MyGlobal.prisma.reddit_clone_post_votes.update({
    where: { id: props.voteId },
    data: { deleted_at: new Date() },
  });
  // Recalculate post score from non-deleted votes
  const votes = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
    where: {
      reddit_clone_post_id: props.postId,
      deleted_at: null,
    },
    select: { vote_type: true },
  });
  const upvotes = votes.filter((v) => v.vote_type === "upvote").length;
  const downvotes = votes.filter((v) => v.vote_type === "downvote").length;
  const postScore = upvotes - downvotes;
  // Adjust karma for post author (only if voter is not the author)
  if (vote.vote_type === "upvote") {
    await MyGlobal.prisma.reddit_clone_user_profiles.update({
      where: { id: vote.post.reddit_clone_user_profile_id },
      data: { karma: { decrement: 1 } },
    });
  } else if (vote.vote_type === "downvote") {
    await MyGlobal.prisma.reddit_clone_user_profiles.update({
      where: { id: vote.post.reddit_clone_user_profile_id },
      data: { karma: { increment: 1 } },
    });
  }
}
