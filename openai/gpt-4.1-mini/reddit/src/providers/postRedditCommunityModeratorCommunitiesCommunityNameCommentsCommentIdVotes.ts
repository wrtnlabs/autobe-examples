import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditCommunityModeratorCommunitiesCommunityNameCommentsCommentIdVotes(props: {
  moderator: ModeratorPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const { moderator, communityName, commentId, body } = props;

  const now = toISOStringSafe(new Date());

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community not found: ${communityName}`, 404);
  }

  // Find the comment by id and ensure it belongs to the community
  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: commentId,
      reddit_community_post_id: undefined, // will be set below
      deleted_at: null,
    },
    select: { id: true, reddit_community_post_id: true },
  });

  if (!comment) {
    throw new HttpException(
      `Comment not found in community: ${commentId}`,
      404,
    );
  }

  if (comment.reddit_community_post_id === undefined) {
    throw new HttpException(`Comment post id missing`, 404);
  }

  // Validate that comment's post belongs to the community
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: comment.reddit_community_post_id },
    select: { reddit_community_community_id: true },
  });

  if (!post || post.reddit_community_community_id !== community.id) {
    throw new HttpException(
      `Comment does not belong to the community: ${commentId}`,
      404,
    );
  }

  // Find the moderator record to get linked user id
  const moderatorRecord =
    await MyGlobal.prisma.reddit_community_moderator.findUnique({
      where: { id: moderator.id },
      select: { user_id: true },
    });

  if (!moderatorRecord) {
    throw new HttpException("Moderator record not found", 403);
  }

  const userId = moderatorRecord.user_id;

  // Check if user already voted on this comment
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        reddit_community_comment_id: commentId,
        reddit_community_user_id: userId,
      },
      select: { id: true },
    });

  if (existingVote) {
    throw new HttpException("Duplicate vote not allowed", 409);
  }

  // Create the vote record
  const created = await MyGlobal.prisma.reddit_community_comment_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_comment_id: commentId,
      reddit_community_user_id: userId,
      reddit_community_community_id: community.id,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      reddit_community_comment_id: true,
      reddit_community_user_id: true,
      reddit_community_community_id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: created.id,
    reddit_community_comment_id: created.reddit_community_comment_id,
    reddit_community_user_id: created.reddit_community_user_id,
    reddit_community_community_id: created.reddit_community_community_id,
    vote_type: created.vote_type,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
