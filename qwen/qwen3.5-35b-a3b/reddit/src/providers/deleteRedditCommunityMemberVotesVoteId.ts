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
  // 1. Query vote by voteId - use OrThrow for automatic 404 handling
  const vote = await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
    where: { id: props.voteId },
  });
  // 2. Validate ownership
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Vote does not belong to this member", 403);
  }
  // 3. Determine target type and verify content exists
  let targetExists: {
    id: string;
    author_id: string;
  } | null = null;
  if (vote.target_post_id !== null) {
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: vote.target_post_id, deleted_at: null },
      select: { id: true, author_id: true },
    });
    targetExists = post;
  } else if (vote.target_comment_id !== null) {
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: vote.target_comment_id, deleted_at: null },
      select: { id: true, reddit_community_members_id: true },
    });
    targetExists = comment
      ? { id: comment.id, author_id: comment.reddit_community_members_id }
      : null;
  }
  if (targetExists === null) {
    throw new HttpException("Content no longer exists", 404);
  }
  // 4. Calculate score adjustment based on vote_type
  const adjustment = vote.vote_type === "UPVOTE" ? -1 : 1;
  // 5. Wrap all operations in transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 6. Soft delete vote
    await tx.reddit_community_votes.update({
      where: { id: props.voteId },
      data: { deleted_at: toISOStringSafe(new Date()) },
    });
    // 7. Recalculate vote score on target
    if (vote.target_post_id !== null) {
      await tx.reddit_community_posts.update({
        where: { id: vote.target_post_id },
        data: { vote_score: { increment: adjustment } },
      });
    }
    // 8. Update author's karma
    const authorId =
      vote.target_post_id !== null ? targetExists.author_id : targetExists.id;
    const authorKarma = await tx.reddit_community_user_karmas.findUnique({
      where: { reddit_community_member_id: authorId },
    });
    if (authorKarma !== null) {
      await tx.reddit_community_user_karmas.update({
        where: { reddit_community_member_id: authorId },
        data: {
          current_score: authorKarma.current_score + adjustment,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
  });
}
