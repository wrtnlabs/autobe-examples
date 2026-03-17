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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneVoteTransformer } from "../transformers/RedditCloneVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneVote.IUpdate;
}): Promise<IRedditCloneVote> {
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId, deleted_at: null },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
      },
    },
  );
  if (comment.reddit_clone_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: comment.reddit_clone_post_id },
    select: { community_id: true },
  });
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: post.community_id,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }
  const existingVote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "COMMENT",
      target_id: props.commentId,
      deleted_at: null,
    },
  });
  const now = new Date();
  if (props.body.vote_type === null) {
    if (existingVote) {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
      const karmaDelta = existingVote.vote_type === "UPVOTE" ? -1 : 1;
      await updateKarmaScore(
        comment.reddit_clone_member_id,
        "COMMENT",
        props.commentId,
        karmaDelta,
      );
      const deletedVote =
        await MyGlobal.prisma.reddit_clone_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          ...RedditCloneVoteTransformer.select(),
        });
      return await RedditCloneVoteTransformer.transform(deletedVote);
    }
    throw new HttpException("No existing vote to remove", 404);
  } else {
    const oldVoteType = existingVote?.vote_type;
    const newVoteType = props.body.vote_type;
    if (existingVote) {
      await MyGlobal.prisma.reddit_clone_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: newVoteType,
          updated_at: now,
        },
      });
    } else {
      await MyGlobal.prisma.reddit_clone_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          target_type: "COMMENT",
          target_id: props.commentId,
          vote_type: newVoteType,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    let karmaDelta = 0;
    if (oldVoteType !== newVoteType) {
      if (oldVoteType === undefined) {
        karmaDelta = newVoteType === "UPVOTE" ? 1 : -1;
      } else if (oldVoteType === "UPVOTE" && newVoteType === "DOWNVOTE") {
        karmaDelta = -2;
      } else if (oldVoteType === "DOWNVOTE" && newVoteType === "UPVOTE") {
        karmaDelta = 2;
      }
    }
    if (karmaDelta !== 0) {
      await updateKarmaScore(
        comment.reddit_clone_member_id,
        "COMMENT",
        props.commentId,
        karmaDelta,
      );
    }
    const vote = await MyGlobal.prisma.reddit_clone_votes.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        target_type: "COMMENT",
        target_id: props.commentId,
        deleted_at: null,
      },
      ...RedditCloneVoteTransformer.select(),
    });
    return await RedditCloneVoteTransformer.transform(vote);
  }
}
async function updateKarmaScore(
  memberId: string & tags.Format<"uuid">,
  sourceType: string,
  sourceId: string & tags.Format<"uuid">,
  delta: number,
): Promise<void> {
  const karmaScore =
    await MyGlobal.prisma.reddit_clone_karma_scores.findFirstOrThrow({
      where: { member_id: memberId },
    });
  await MyGlobal.prisma.reddit_clone_karma_scores.update({
    where: { member_id: memberId },
    data: {
      score: { increment: delta },
    },
  });
  await MyGlobal.prisma.reddit_clone_karma_score_changes.create({
    data: {
      id: v4(),
      reddit_clone_karma_score_id: karmaScore.id,
      source_type: sourceType,
      source_id: sourceId,
      change_amount: delta,
      created_at: new Date(),
    },
  });
}
