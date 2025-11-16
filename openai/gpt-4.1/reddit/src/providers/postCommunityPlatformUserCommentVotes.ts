import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommentVotes(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Check if the comment exists and is active (deleted_at: null)
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.body.community_platform_comment_id },
  });
  if (!comment || comment.deleted_at) {
    throw new HttpException("Comment does not exist or has been deleted.", 404);
  }

  // 2. Check for an existing (active or soft-deleted) vote by this user for this comment
  const existing =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_comment_id: props.body.community_platform_comment_id,
        community_platform_user_id: props.user.id,
      },
    });

  let vote;
  const now = toISOStringSafe(new Date());
  if (!existing) {
    // 3a. No existing row: create a new vote
    vote = await MyGlobal.prisma.community_platform_comment_votes.create({
      data: {
        id: v4(),
        community_platform_comment_id: props.body.community_platform_comment_id,
        community_platform_user_id: props.user.id,
        vote_type: props.body.vote_type,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } else if (existing.deleted_at) {
    // 3b. Existing is soft deleted; reactivate and update vote_type
    vote = await MyGlobal.prisma.community_platform_comment_votes.update({
      where: { id: existing.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: now,
        deleted_at: null,
      },
    });
  } else {
    // 4. There is already an active vote; update the vote_type if it is different, update timestamp, else error
    if (existing.vote_type === props.body.vote_type) {
      throw new HttpException(
        `You have already ${existing.vote_type === "up" ? "upvoted" : "downvoted"} this comment.`,
        400,
      );
    }
    vote = await MyGlobal.prisma.community_platform_comment_votes.update({
      where: { id: existing.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: now,
      },
    });
  }

  // Load comment summary, user summary, and post summary for API output
  const [commentSummary, userSummary] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: vote.community_platform_comment_id },
      select: {
        id: true,
        user_id: true,
        post_id: true,
        parent_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: vote.community_platform_user_id },
      select: { id: true },
    }),
  ]);
  if (!commentSummary || !userSummary) {
    throw new HttpException("Failed to load vote references.", 500);
  }

  // Load post summary for comment.post (must include required ISummary fields)
  const postSummary = await MyGlobal.prisma.community_platform_posts.findUnique(
    {
      where: { id: commentSummary.post_id },
      select: {
        id: true,
        community_id: true,
        user_id: true,
      },
    },
  );
  if (!postSummary) {
    throw new HttpException("Failed to load post referenced by comment.", 500);
  }

  // Compose DTO for response
  return {
    id: vote.id,
    comment: {
      id: commentSummary.id,
      user: {
        id: commentSummary.user_id,
      },
      post: {
        id: postSummary.id,
        community_id: postSummary.community_id,
        user_id: postSummary.user_id,
      },
      parent_id: commentSummary.parent_id ?? undefined,
      created_at: toISOStringSafe(commentSummary.created_at),
    },
    user: { id: userSummary.id },
    vote_type: typia.assert<"up" | "down">(vote.vote_type),
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : undefined,
  };
}
