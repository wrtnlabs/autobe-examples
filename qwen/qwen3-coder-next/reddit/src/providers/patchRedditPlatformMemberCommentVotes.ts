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
import { RedditPlatformCommentVoteCollector } from "../collectors/RedditPlatformCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentVoteTransformer } from "../transformers/RedditPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommentVotes(props: {
  member: MemberPayload;
  body: IRedditPlatformCommentVote.ICreate;
}): Promise<IRedditPlatformCommentVote | void> {
  // Check if comment exists
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.body.comment_id },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Check for self-vote prohibition
  if (comment.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 409);
  }
  // Check existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
      where: {
        member_id_comment_id: {
          member_id: props.member.id,
          comment_id: props.body.comment_id,
        },
      },
    });
  let created;
  if (existingVote) {
    // Handle vote change or revocation
    const currentVoteType = existingVote.vote_type as
      | "UPVOTE"
      | "DOWNVOTE"
      | "NONE";
    const newVoteType = props.body.vote_type.toLowerCase() as
      | "upvote"
      | "downvote"
      | "none";
    if (currentVoteType === newVoteType.toUpperCase()) {
      // Vote revocation - remove the vote
      await MyGlobal.prisma.reddit_platform_comment_votes.delete({
        where: { id: existingVote.id },
      });
      // Update comment score
      const scoreChange =
        currentVoteType === "UPVOTE"
          ? -1
          : currentVoteType === "DOWNVOTE"
            ? 1
            : 0;
      await MyGlobal.prisma.reddit_platform_comments.update({
        where: { id: props.body.comment_id },
        data: { vote_score: { increment: scoreChange } },
      });
      return;
    } else {
      // Vote type change - update existing vote
      const oldScore =
        currentVoteType === "UPVOTE"
          ? 1
          : currentVoteType === "DOWNVOTE"
            ? -1
            : 0;
      const newScore =
        newVoteType === "upvote" ? 1 : newVoteType === "downvote" ? -1 : 0;
      const scoreDifference = newScore - oldScore;
      created = await MyGlobal.prisma.reddit_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: newVoteType.toUpperCase(),
          updated_at: new Date(),
        },
        ...RedditPlatformCommentVoteTransformer.select(),
      });
      // Update comment score
      await MyGlobal.prisma.reddit_platform_comments.update({
        where: { id: props.body.comment_id },
        data: { vote_score: { increment: scoreDifference } },
      });
    }
  } else {
    // Create new vote
    created = await MyGlobal.prisma.reddit_platform_comment_votes.create({
      data: await RedditPlatformCommentVoteCollector.collect({
        body: props.body,
        member: { id: props.member.id },
        comment: { id: props.body.comment_id },
      }),
      ...RedditPlatformCommentVoteTransformer.select(),
    });
    // Update comment score
    const scoreChange =
      props.body.vote_type === "upvote"
        ? 1
        : props.body.vote_type === "downvote"
          ? -1
          : 0;
    await MyGlobal.prisma.reddit_platform_comments.update({
      where: { id: props.body.comment_id },
      data: { vote_score: { increment: scoreChange } },
    });
  }
  return await RedditPlatformCommentVoteTransformer.transform(created);
}
