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

export async function deleteRedditLikeMemberPostsPostIdMyVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the existing vote by this member on this post
  const postVote = await MyGlobal.prisma.reddit_like_post_votes.findFirst({
    where: {
      reddit_like_post_id: props.postId,
      vote: {
        member_id: props.member.id,
      },
    },
    select: {
      id: true,
      reddit_like_vote_id: true,
      vote: {
        select: {
          vote_type: true,
        },
      },
      post: {
        select: {
          author_id: true,
          vote_score: true,
        },
      },
    },
  });
  if (postVote === null) {
    throw new HttpException("Vote not found", 404);
  }
  const voteType = postVote.vote.vote_type;
  const scoreAdjustment = voteType === "upvote" ? -1 : 1;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the post vote record (cascade will handle reddit_like_votes due to onDelete: Cascade)
    await tx.reddit_like_post_votes.delete({
      where: { id: postVote.id },
    });
    // Update post vote score
    await tx.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: {
          increment: scoreAdjustment,
        },
        updated_at: new Date().toISOString() as unknown as Date,
      },
    });
  });
}
