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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberCommentsCommentId(props: {
  member: MemberPayload;
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
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Fetch related member
  const member = comment.community_member_id
    ? await MyGlobal.prisma.community_members.findUnique({
        where: { id: comment.community_member_id },
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          is_email_verified: true,
        },
      })
    : null;
  // Fetch related post
  const post = comment.community_post_id
    ? await MyGlobal.prisma.community_posts.findUnique({
        where: { id: comment.community_post_id },
        select: {
          id: true,
          title: true,
          content_type: true,
        },
      })
    : null;
  return {
    id: comment.id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    status: comment.status,
    author: member
      ? {
          id: member.id,
          display_name: member.display_name,
          avatar_url: member.avatar_url,
          is_email_verified: member.is_email_verified,
        }
      : {
          id: "",
          display_name: "Deleted User",
          avatar_url: null,
          is_email_verified: false,
        },
    post: post
      ? {
          id: post.id,
          title: post.title,
          content_type: post.content_type,
        }
      : {
          id: "",
          title: "Deleted Post",
          content_type: "text/plain",
        },
  };
}
