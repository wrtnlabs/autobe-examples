import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformMemberVotes(props: {
  member: MemberPayload;
  body: IRedditPlatformCommentVote.IRequest;
}): Promise<IRedditPlatformCommentVote> {
  // Check for existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
      where: {
        member_id_comment_id: {
          member_id: props.member.id,
          comment_id: props.body.comment_id,
        },
      },
    });
  // Calculate vote score based on vote type
  const voteScore =
    props.body.vote_type === "UPVOTE"
      ? 1
      : props.body.vote_type === "DOWNVOTE"
        ? -1
        : 0;
  const now = toISOStringSafe(new Date());
  // Update or create vote
  const vote = existingVote
    ? await MyGlobal.prisma.reddit_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: now,
        },
      })
    : await MyGlobal.prisma.reddit_platform_comment_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          comment_id: props.body.comment_id,
          vote_type: props.body.vote_type,
          created_at: now,
          updated_at: now,
        },
      });
  // Update comment vote score
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: vote.comment_id },
    data: {
      vote_score: {
        increment: voteScore,
      },
    },
  });
  // Transform to response DTO using transformers
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: vote.comment_id },
    include: {
      author: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  const transformedMember: IRedditPlatformMember.ISummary = {
    id: props.member.id as string & tags.Format<"uuid">,
    username: "",
  };
  const transformedComment: IRedditPlatformComment.ISummary = {
    id: comment.id as string & tags.Format<"uuid">,
    content: comment.content,
    voteScore: comment.vote_score,
    createdAt: toISOStringSafe(comment.created_at),
    author: {
      id: comment.author_id as string & tags.Format<"uuid">,
      username: comment.author.username,
      displayName: comment.author.display_name ?? null,
      avatarUrl: comment.author.avatar_url ?? null,
    },
  };
  return {
    id: vote.id as string & tags.Format<"uuid">,
    member: transformedMember,
    comment: transformedComment,
    vote_type:
      vote.vote_type as IRedditPlatformCommentVote.IRequest["vote_type"],
    vote_score: voteScore,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
