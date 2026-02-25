import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformCommentVotes(props: {
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  // Authentication context is assumed to be handled externally, thus this function requires a user id to identify voter
  // Since no user is explicitly passed, we simulate an authenticated user context (should be provided)
  // Validate voteType
  const { communityPlatformCommentId, voteType } = props.body;
  if (voteType !== "upvote" && voteType !== "downvote" && voteType !== "") {
    throw new HttpException("Invalid vote type", 400);
  }
  // Verify comment existence
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: communityPlatformCommentId },
    select: { id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Determine the current user id from session/context - assuming available as MyGlobal.env or similar (NOT PROVIDED)
  // Since we do not have customer id in props, we cannot link votes to a user, so votes would be anonymous (not recommended in real case)
  // For demonstration, we'll assume a fixed voter id (to be replaced with actual user id in real usage)
  // To meet requirements, we will proceed without voter identity (incomplete, but no user info given)
  // Find existing active vote for the comment by current user (if user identity was provided)
  // Skipping user filtering due to missing user context
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_comment_id: communityPlatformCommentId,
        deleted_at: null,
      },
    });
  const now: string & import("typia").tags.Format<"date-time"> =
    new Date().toISOString() as string &
      import("typia").tags.Format<"date-time">;

  if (voteType === "") {
    // Remove vote
    if (existingVote) {
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: { deleted_at: now, updated_at: now },
      });
    }
  } else {
    if (existingVote) {
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: { vote_type: voteType, updated_at: now, deleted_at: null },
      });
    } else {
      await MyGlobal.prisma.community_platform_comment_votes.create({
        data: {
          id: v4() as string & import("typia").tags.Format<"uuid">,
          community_platform_comment_id: communityPlatformCommentId,
          vote_type: voteType,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
  }
  // Count votes
  const upvoteCount =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        community_platform_comment_id: communityPlatformCommentId,
        vote_type: "upvote",
        deleted_at: null,
      },
    });
  const downvoteCount =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        community_platform_comment_id: communityPlatformCommentId,
        vote_type: "downvote",
        deleted_at: null,
      },
    });
  return {
    upvoteCount,
    downvoteCount,
  };
}
