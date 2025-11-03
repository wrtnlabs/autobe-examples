import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminCommunitiesCommunityNameCommentsCommentIdVotes(props: {
  admin: AdminPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const { admin, communityName, commentId, body } = props;

  const adminRecord = await MyGlobal.prisma.reddit_community_admin.findFirst({
    where: { user_id: admin.id },
  });
  if (!adminRecord) {
    throw new HttpException("Admin not found", 403);
  }

  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: commentId,
      post: {
        community: { name: communityName },
      },
      deleted_at: null,
    },
    select: {
      id: true,
      post: {
        select: {
          reddit_community_community_id: true,
        },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found or community mismatch", 404);
  }

  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        reddit_community_comment_id: commentId,
        reddit_community_user_id: admin.id,
      },
    });
  if (existingVote) {
    throw new HttpException(
      "Vote already exists for this comment by this admin",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.reddit_community_comment_votes.create({
    data: {
      id,
      reddit_community_comment_id: body.reddit_community_comment_id,
      reddit_community_user_id: admin.id,
      reddit_community_community_id: comment.post.reddit_community_community_id,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
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
