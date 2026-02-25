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

export async function deleteRedditMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_comment_votes.findUnique({
    where: { id: props.voteId },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.reddit_comment_id !== props.commentId) {
    throw new HttpException("Vote does not belong to this comment", 404);
  }
  const comment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      author: true,
      reddit_post_id: true,
    },
  });
  const post = await MyGlobal.prisma.reddit_posts.findUniqueOrThrow({
    where: { id: comment.reddit_post_id },
  });
  const community = await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
    where: { id: post.reddit_communities_id },
  });
  const isModerator = await MyGlobal.prisma.reddit_community_bans.findUnique({
    where: {
      community_id_user_id: {
        community_id: community.id,
        user_id: props.member.id,
      },
    },
  });
  const isOwner = vote.reddit_member_id === props.member.id;
  if (!isOwner && !isModerator) {
    throw new HttpException("Not authorized to remove this vote", 403);
  }
  if (vote.vote_direction === "up") {
    await MyGlobal.prisma.reddit_profiles.update({
      where: { user_id: comment.author.id },
      data: { karma: { decrement: 1 } },
    });
  } else if (vote.vote_direction === "down") {
    await MyGlobal.prisma.reddit_profiles.update({
      where: { user_id: comment.author.id },
      data: { karma: { increment: 1 } },
    });
  }
  await MyGlobal.prisma.reddit_comment_votes.delete({
    where: { id: vote.id },
  });
}
