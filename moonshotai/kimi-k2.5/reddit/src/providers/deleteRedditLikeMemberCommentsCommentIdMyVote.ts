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

export async function deleteRedditLikeMemberCommentsCommentIdMyVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the existing vote by joining votes with comment_votes
  const voteRecord = await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
    where: {
      comment_id: props.commentId,
      vote: {
        member_id: props.member.id,
      },
    },
    select: {
      vote_id: true,
      vote: {
        select: {
          vote_type: true,
        },
      },
    },
  });
  if (voteRecord === null) {
    throw new HttpException("Vote not found", 404);
  }
  // Calculate vote value: upvote = +1, downvote = -1
  const voteValue: number = voteRecord.vote.vote_type === "upvote" ? 1 : -1;
  // Delete the vote (cascade will remove from reddit_like_comment_votes)
  await MyGlobal.prisma.reddit_like_votes.delete({
    where: {
      id: voteRecord.vote_id,
    },
  });
  // Update comment vote_score: subtract the vote value
  // Removing upvote (voteValue=1) -> score decreases by 1
  // Removing downvote (voteValue=-1) -> score increases by 1
  await MyGlobal.prisma.reddit_like_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      vote_score: {
        decrement: voteValue,
      },
    },
  });
}
