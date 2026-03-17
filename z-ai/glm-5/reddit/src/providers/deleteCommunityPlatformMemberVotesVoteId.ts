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

export async function deleteCommunityPlatformMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Try to find the vote in post_votes first (hard-delete table, no deleted_at)
  const postVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: { id: props.voteId },
    });
  if (postVote !== null) {
    // Verify ownership
    if (postVote.member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Get the post to find its author
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: postVote.post_id },
        select: { author_id: true },
      });
    // Determine karma adjustment (upvote removal: -1 karma, downvote removal: +1 karma)
    const karmaChange = postVote.vote_type === "upvote" ? -1 : 1;
    // Transaction: delete vote and update karma
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_members.update({
        where: { id: post.author_id },
        data: { karma: { increment: karmaChange } },
      }),
      MyGlobal.prisma.community_platform_post_votes.delete({
        where: { id: props.voteId },
      }),
    ]);
    return;
  }
  // Try to find the vote in comment_votes (has deleted_at column)
  const commentVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.voteId },
      select: {
        community_platform_member_id: true,
        community_platform_comment_id: true,
        vote_type: true,
        deleted_at: true,
        comment: {
          select: { community_platform_member_id: true },
        },
      },
    });
  if (commentVote === null || commentVote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  // Verify ownership
  if (commentVote.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Determine karma and vote_score adjustments
  // Upvote removal: -1 karma, -1 score; Downvote removal: +1 karma, +1 score
  const karmaChange = commentVote.vote_type === "upvote" ? -1 : 1;
  const scoreChange = commentVote.vote_type === "upvote" ? -1 : 1;
  // Transaction: delete vote, update karma, update vote_score
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_members.update({
      where: { id: commentVote.comment.community_platform_member_id },
      data: { karma: { increment: karmaChange } },
    }),
    MyGlobal.prisma.community_platform_comments.update({
      where: { id: commentVote.community_platform_comment_id },
      data: { vote_score: { increment: scoreChange } },
    }),
    MyGlobal.prisma.community_platform_comment_votes.delete({
      where: { id: props.voteId },
    }),
  ]);
}
