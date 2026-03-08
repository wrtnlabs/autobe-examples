import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
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

export async function getRedditPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommentVote.ISummary> {
  await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  const votes = await MyGlobal.prisma.reddit_platform_comment_votes.groupBy({
    by: ["vote_type"],
    where: {
      comment_id: props.commentId,
      deleted_at: null,
    },
    _count: {
      vote_type: true,
    },
  });
  const upvoteVote = votes.find((v) => v.vote_type === "upvote");
  const downvoteVote = votes.find((v) => v.vote_type === "downvote");
  const upvoteCount = upvoteVote?._count.vote_type ?? 0;
  const downvoteCount = downvoteVote?._count.vote_type ?? 0;
  const userVoteRecord =
    await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
      where: {
        comment_id: props.commentId,
        user_id: props.member.id,
        vote_type: { in: ["upvote", "downvote"] },
        deleted_at: null,
      },
    });
  const userVote =
    userVoteRecord?.vote_type === "upvote"
      ? "upvote"
      : userVoteRecord?.vote_type === "downvote"
        ? "downvote"
        : null;
  const score = upvoteCount - downvoteCount;
  const totalVotes = upvoteCount + downvoteCount;
  return {
    commentId: props.commentId,
    score: score,
    upvoteCount: upvoteCount,
    downvoteCount: downvoteCount,
    userVote: userVote,
    totalVotes: totalVotes,
  } satisfies IRedditPlatformCommentVote.ISummary;
}
