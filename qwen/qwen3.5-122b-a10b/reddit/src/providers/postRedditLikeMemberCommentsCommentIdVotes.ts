import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeVoteCollector } from "../collectors/RedditLikeVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteTransformer } from "../transformers/RedditLikeVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeVote.ICreate;
}): Promise<IRedditLikeVote> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_like_member_id: true,
      deleted_at: true,
    },
  });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 400);
  }
  const existingVote = await MyGlobal.prisma.reddit_like_votes.findFirst({
    where: {
      reddit_like_member_id: props.member.id,
      reddit_like_comment_id: props.commentId,
      deleted_at: null,
    },
  });
  let vote: Prisma.reddit_like_votesGetPayload<
    ReturnType<typeof RedditLikeVoteTransformer.select>
  >;
  if (existingVote) {
    const oldVoteType = existingVote.vote_type;
    const newVoteType = props.body.vote_type;
    if (oldVoteType !== newVoteType) {
      let karmaDelta = 0;
      if (oldVoteType === "upvote" && newVoteType === "downvote") {
        karmaDelta = -2;
      } else if (oldVoteType === "downvote" && newVoteType === "upvote") {
        karmaDelta = 2;
      }
      await MyGlobal.prisma.reddit_like_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: newVoteType,
          updated_at: new Date(),
        },
      });
      await MyGlobal.prisma.reddit_like_user_profiles.update({
        where: { reddit_like_member_id: comment.reddit_like_member_id },
        data: { karma_score: { increment: karmaDelta } },
      });
    }
    vote = await MyGlobal.prisma.reddit_like_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...RedditLikeVoteTransformer.select(),
    });
  } else {
    const karmaDelta = props.body.vote_type === "upvote" ? 1 : -1;
    vote = await MyGlobal.prisma.reddit_like_votes.create({
      data: await RedditLikeVoteCollector.collect({
        body: props.body,
        member: { id: props.member.id },
        comment: { id: props.commentId },
      }),
      ...RedditLikeVoteTransformer.select(),
    });
    await MyGlobal.prisma.reddit_like_user_profiles.update({
      where: { reddit_like_member_id: comment.reddit_like_member_id },
      data: { karma_score: { increment: karmaDelta } },
    });
  }
  return await RedditLikeVoteTransformer.transform(vote);
}
