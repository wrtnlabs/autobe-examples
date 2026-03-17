import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberPostsPostIdMyVote(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the existing vote by this member on this post
  // Query through reddit_like_votes joined with reddit_like_post_votes
  const existingVote = await MyGlobal.prisma.reddit_like_votes.findFirst({
    where: {
      member_id: props.member.id,
      postVote: {
        reddit_like_post_id: props.postId,
      },
    },
    select: {
      id: true,
      vote_type: true,
      postVote: {
        select: {
          post: {
            select: {
              author_id: true,
              vote_score: true,
            },
          },
        },
      },
    },
  });
  if (existingVote === null || existingVote.postVote === null) {
    throw new HttpException("Vote not found", 404);
  }
  const post = existingVote.postVote.post;
  const voteType = existingVote.vote_type;
  const currentVoteScore = post.vote_score;
  // Calculate adjustments based on vote type being removed
  // If removing UP vote: score decreases by 1
  // If removing DOWN vote: score increases by 1
  const postScoreAdjustment = voteType === "UP" ? -1 : 1;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the vote record (cascades to post_votes via FK onDelete: Cascade)
    await tx.reddit_like_votes.delete({
      where: { id: existingVote.id },
    });
    // Update post vote_score
    await tx.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: currentVoteScore + postScoreAdjustment,
      },
    });
    // Note: karma field doesn't exist in reddit_like_members schema
    // Skipping karma update as schema doesn't support it
  });
}
