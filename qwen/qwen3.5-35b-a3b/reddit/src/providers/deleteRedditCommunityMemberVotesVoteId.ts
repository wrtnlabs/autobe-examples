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

export async function deleteRedditCommunityMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
    where: { id: props.voteId },
  });
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Vote does not belong to this member", 403);
  }
  let voteType: "upvote" | "downvote";
  if (vote.vote_type === "upvote" || vote.vote_type === "downvote") {
    voteType = vote.vote_type;
  } else {
    throw new HttpException("Invalid vote type", 400);
  }
  const scoreAdjustment = voteType === "upvote" ? -1 : 1;
  let targetExists: boolean = false;
  let targetPostId: string | null = null;
  let targetCommentId: string | null = null;
  let contentAuthorId: string | null = null;
  if (vote.target_post_id !== null) {
    targetPostId = vote.target_post_id;
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: targetPostId, deleted_at: null },
      select: { id: true, author_id: true },
    });
    targetExists = post !== null;
    if (post !== null) {
      contentAuthorId = post.author_id;
    }
  } else if (vote.target_comment_id !== null) {
    targetCommentId = vote.target_comment_id;
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: targetCommentId, deleted_at: null },
      select: { id: true, reddit_community_members_id: true },
    });
    targetExists = comment !== null;
    if (comment !== null) {
      contentAuthorId = comment.reddit_community_members_id;
    }
  }
  if (!targetExists) {
    throw new HttpException("Content no longer exists", 404);
  }
  await MyGlobal.prisma.reddit_community_votes.delete({
    where: { id: props.voteId },
  });
  if (vote.target_post_id !== null && targetPostId !== null) {
    await MyGlobal.prisma.reddit_community_vote_of_posts.delete({
      where: { vote_id: props.voteId },
    });
    await MyGlobal.prisma.reddit_community_posts.update({
      where: { id: targetPostId },
      data: { vote_score: { increment: scoreAdjustment } },
    });
    if (contentAuthorId !== null) {
      const authorKarma =
        await MyGlobal.prisma.reddit_community_user_karmas.findUnique({
          where: { reddit_community_member_id: contentAuthorId },
        });
      if (authorKarma !== null) {
        await MyGlobal.prisma.reddit_community_user_karmas.update({
          where: { reddit_community_member_id: contentAuthorId },
          data: { current_score: { increment: scoreAdjustment } },
        });
      }
    }
  } else if (vote.target_comment_id !== null && targetCommentId !== null) {
    await MyGlobal.prisma.reddit_community_vote_of_comments.delete({
      where: { vote_id: props.voteId },
    });
    const votes = await MyGlobal.prisma.reddit_community_votes.findMany({
      where: { target_comment_id: targetCommentId, deleted_at: null },
      select: { vote_type: true },
    });
    const upvotes = votes.filter((v) => v.vote_type === "upvote").length;
    const downvotes = votes.filter((v) => v.vote_type === "downvote").length;
    const newScore = upvotes - downvotes;
    if (contentAuthorId !== null) {
      const authorKarma =
        await MyGlobal.prisma.reddit_community_user_karmas.findUnique({
          where: { reddit_community_member_id: contentAuthorId },
        });
      if (authorKarma !== null) {
        await MyGlobal.prisma.reddit_community_user_karmas.update({
          where: { reddit_community_member_id: contentAuthorId },
          data: { current_score: { increment: scoreAdjustment } },
        });
      }
    }
  }
}
