import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityComment> {
  // Find the comment with matching postId and commentId, not deleted
  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: props.commentId,
      reddit_community_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_community_post_id: true,
      parent_id: true,
      body: true,
      reddit_community_registereduser_id: true,
      reddit_community_registereduser_session_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Fetch author info
  const authorRaw =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: comment.reddit_community_registereduser_id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!authorRaw) {
    throw new HttpException("Comment author not found", 404);
  }

  // Count children comments which are not deleted
  const childrenCount = await MyGlobal.prisma.reddit_community_comments.count({
    where: {
      parent_id: comment.id,
      deleted_at: null,
    },
  });

  // Sum votes count (assuming votes are stored in related tables, but without details, using 0)
  // If votes exist, should query comment votes related table here
  // For now, 0 votes count as placeholder
  const votesCount = 0;

  return {
    id: comment.id,
    post_id: comment.reddit_community_post_id,
    parent_id: comment.parent_id ?? undefined,
    author: {
      id: authorRaw.id,
      email: authorRaw.email,
      created_at: toISOStringSafe(authorRaw.created_at),
      updated_at: toISOStringSafe(authorRaw.updated_at),
      deleted_at: authorRaw.deleted_at
        ? toISOStringSafe(authorRaw.deleted_at)
        : null,
    },
    content: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at ? toISOStringSafe(comment.updated_at) : null,
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    votes_count: votesCount,
    is_deleted: comment.deleted_at !== null,
    children_count: childrenCount,
    author_session_id: comment.reddit_community_registereduser_session_id,
  };
}
