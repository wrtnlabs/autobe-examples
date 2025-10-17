import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";

export async function getCommunityPortalPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPortalComment> {
  const { postId, commentId } = props;

  const commentRecord =
    await MyGlobal.prisma.community_portal_comments.findFirst({
      where: {
        id: commentId,
        post_id: postId,
        deleted_at: null,
      },
      include: {
        post: {
          select: { community_id: true },
        },
      },
    });

  if (!commentRecord) throw new HttpException("Not Found", 404);

  const community =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { id: commentRecord.post.community_id },
      select: { is_private: true },
    });

  if (!community) throw new HttpException("Not Found", 404);

  if (community.is_private) throw new HttpException("Forbidden", 403);

  return {
    id: commentRecord.id,
    post_id: commentRecord.post_id,
    parent_comment_id:
      commentRecord.parent_comment_id === null
        ? null
        : commentRecord.parent_comment_id,
    author_user_id:
      commentRecord.author_user_id === null
        ? null
        : (commentRecord.author_user_id ?? undefined),
    body: commentRecord.body,
    created_at: toISOStringSafe(commentRecord.created_at),
    updated_at: toISOStringSafe(commentRecord.updated_at),
    deleted_at: null,
  };
}
