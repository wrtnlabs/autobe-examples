import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentVoteTransformer } from "../transformers/CommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityCommentVote.ICreate;
}): Promise<ICommunityCommentVote> {
  const comment = await MyGlobal.prisma.community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      community_member_id: true,
      community_post_id: true,
      is_deleted: true,
    },
  });
  if (comment.is_deleted) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.community_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  const post = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: comment.community_post_id },
    select: { community_id: true },
  });
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: {
      community_id_member_id: {
        community_id: post.community_id,
        member_id: props.member.id,
      },
    },
  });
  if (
    ban !== null &&
    (ban.expired_at === null || ban.expired_at > new Date())
  ) {
    throw new HttpException("You are banned from this community", 403);
  }
  const existingVote = await MyGlobal.prisma.community_comment_votes.findUnique(
    {
      where: {
        community_member_id_community_comment_id: {
          community_member_id: props.member.id,
          community_comment_id: props.commentId,
        },
      },
    },
  );
  const newDirection =
    props.body.vote === 1 ? true : props.body.vote === -1 ? false : null;
  let scoreChange = 0;
  let upvoteChange = 0;
  let downvoteChange = 0;
  if (existingVote === null) {
    if (newDirection === true) {
      scoreChange = 1;
      upvoteChange = 1;
    } else if (newDirection === false) {
      scoreChange = -1;
      downvoteChange = 1;
    }
  } else {
    if (newDirection === null) {
      scoreChange = existingVote.direction ? -1 : 1;
      upvoteChange = existingVote.direction ? -1 : 0;
      downvoteChange = existingVote.direction ? 0 : -1;
    } else if (existingVote.direction !== newDirection) {
      if (newDirection === true) {
        scoreChange = 2;
        upvoteChange = 1;
        downvoteChange = -1;
      } else {
        scoreChange = -2;
        upvoteChange = -1;
        downvoteChange = 1;
      }
    }
  }
  const now = new Date();
  if (newDirection === null) {
    if (existingVote !== null) {
      await MyGlobal.prisma.community_comment_votes.delete({
        where: { id: existingVote.id },
      });
    }
  } else if (existingVote === null) {
    await MyGlobal.prisma.community_comment_votes.create({
      data: {
        id: v4(),
        community_comment_id: props.commentId,
        community_member_id: props.member.id,
        direction: newDirection,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (existingVote.direction !== newDirection) {
    await MyGlobal.prisma.community_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: newDirection,
        updated_at: now,
      },
    });
  }
  if (scoreChange !== 0) {
    await MyGlobal.prisma.community_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: scoreChange },
        upvote_count: { increment: upvoteChange },
        downvote_count: { increment: downvoteChange },
        updated_at: now,
      },
    });
    await MyGlobal.prisma.community_members.update({
      where: { id: comment.community_member_id },
      data: {
        karma: { increment: scoreChange },
        updated_at: now,
      },
    });
  }
  const voteRecord = await MyGlobal.prisma.community_comment_votes.findUnique({
    where: {
      community_member_id_community_comment_id: {
        community_member_id: props.member.id,
        community_comment_id: props.commentId,
      },
    },
    ...CommunityCommentVoteTransformer.select(),
  });
  if (voteRecord === null) {
    throw new HttpException("Vote removed", 200);
  }
  return await CommunityCommentVoteTransformer.transform(voteRecord);
}
