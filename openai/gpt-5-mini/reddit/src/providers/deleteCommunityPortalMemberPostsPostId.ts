import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPortalMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
  });

  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (post.status === "archived" || post.status === "locked") {
    throw new HttpException(
      "Conflict: Post cannot be deleted due to its status",
      409,
    );
  }

  const isOwner =
    post.author_user_id !== null && post.author_user_id === member.id;

  const [moderator, admin] = await Promise.all([
    MyGlobal.prisma.community_portal_moderators.findFirst({
      where: {
        user_id: member.id,
        is_active: true,
        OR: [{ community_id: post.community_id }, { community_id: null }],
      },
    }),
    MyGlobal.prisma.community_portal_admins.findFirst({
      where: { user_id: member.id, is_active: true },
    }),
  ]);

  if (!isOwner && !moderator && !admin) {
    throw new HttpException(
      "Unauthorized: You can only delete your own posts or must be a moderator/admin",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_portal_posts.update({
      where: { id: postId },
      data: { deleted_at: now },
    }),
    MyGlobal.prisma.community_portal_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter_user_id: member.id,
        community_id: post.community_id,
        post_id: postId,
        reason_code: "deleted",
        reason_text: `Soft-deleted by ${member.id}${isOwner ? " (owner)" : moderator ? " (moderator)" : " (admin)"}`,
        status: "CLOSED",
        is_urgent: false,
        created_at: now,
        reviewed_at: now,
        closed_at: now,
        closed_by_moderator_id: moderator ? moderator.id : null,
        resolution_notes:
          "Soft-deleted via member/posts erase endpoint for audit trail",
      },
    }),
  ]);

  return;
}
