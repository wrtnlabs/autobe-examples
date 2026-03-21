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
  // 1. Load the vote with post relation to verify ownership and post match
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique({
    where: { id: props.voteId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_post_id: true,
      direction: true,
      post: {
        select: {
          id: true,
          reddit_clone_member_id: true,
          vote_score: true,
        },
      },
    },
  });
  // 2. If vote not found, return 404
  if (vote === null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Verify vote belongs to the specified post
  if (vote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify vote belongs to the authenticated member
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Determine vote direction for score adjustment
  const isUpvote: boolean = vote.direction === "upvote";
  const scoreDelta: number = isUpvote ? -1 : 1;
  // 6. Execute deletion and score adjustments in transaction
  await MyGlobal.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 6a. Delete the vote record
    await tx.reddit_clone_post_votes.delete({
      where: { id: props.voteId },
    });
    // 6b. Update post's vote_score
    await tx.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: scoreDelta },
        updated_at: new Date(),
      },
    });
    // 6c. Update post author's karma
    await tx.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: vote.post.reddit_clone_member_id },
      data: {
        karma_score: { increment: scoreDelta },
        updated_at: new Date(),
      },
    });
  });
}
