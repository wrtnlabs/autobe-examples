import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityComment> {
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      status: true,
      community_member_id: true,
      community_post_id: true,
      author: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          is_email_verified: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          content_type: true,
        },
      },
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  return {
    id: comment.id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    status: comment.status,
    author: {
      id: comment.author.id,
      display_name: comment.author.display_name,
      avatar_url: comment.author.avatar_url,
      is_email_verified: comment.author.is_email_verified,
    },
    post: {
      id: comment.post.id,
      title: comment.post.title,
      content_type: comment.post.content_type,
    },
  };
}
