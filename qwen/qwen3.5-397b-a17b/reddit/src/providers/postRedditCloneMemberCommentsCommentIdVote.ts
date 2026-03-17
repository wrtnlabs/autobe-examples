import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneVoteCollector } from "../collectors/RedditCloneVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneVoteTransformer } from "../transformers/RedditCloneVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneVote.ICreate;
}): Promise<IRedditCloneVote> {
  // Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
    },
  );
  // Check member is not voting on their own comment
  if (comment.reddit_clone_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Check for existing vote
  const existingVote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "COMMENT",
      target_id: props.commentId,
      deleted_at: null,
    },
  });
  let vote: Prisma.reddit_clone_votesGetPayload<
    ReturnType<typeof RedditCloneVoteTransformer.select>
  >;
  if (existingVote) {
    // If vote_type unchanged, return existing
    if (existingVote.vote_type === props.body.vote_type) {
      vote = await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCloneVoteTransformer.select(),
      });
      return await RedditCloneVoteTransformer.transform(vote);
    }
    // If vote_type is null, remove the vote (soft delete)
    if (props.body.vote_type === null) {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
      // Return the deleted vote record
      vote = await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCloneVoteTransformer.select(),
      });
      return await RedditCloneVoteTransformer.transform(vote);
    }
    // Vote type changed - update existing vote
    await MyGlobal.prisma.reddit_clone_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
    });
    vote = await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...RedditCloneVoteTransformer.select(),
    });
    return await RedditCloneVoteTransformer.transform(vote);
  }
  // No existing vote - create new if vote_type is not null
  if (props.body.vote_type === null) {
    throw new HttpException("No existing vote to remove", 404);
  }
  const created = await MyGlobal.prisma.reddit_clone_votes.create({
    data: await RedditCloneVoteCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditCloneComments: { id: props.commentId },
    }),
    ...RedditCloneVoteTransformer.select(),
  });
  return await RedditCloneVoteTransformer.transform(created);
}
