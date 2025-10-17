import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPortalMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, commentId } = props;

  if (!member) {
    throw new HttpException("Unauthorized", 401);
  }

  const comment = await MyGlobal.prisma.community_portal_comments.findUnique({
    where: { id: commentId },
    include: { post: { select: { id: true, community_id: true } } },
  });

  if (!comment) throw new HttpException("Not Found", 404);
  if (comment.post_id !== postId) throw new HttpException("Not Found", 404);
  if (comment.deleted_at !== null) throw new HttpException("Not Found", 404);

  const isAuthor = comment.author_user_id === member.id;

  if (!isAuthor) {
    const communityId = comment.post?.community_id ?? null;

    const moderator =
      communityId === null
        ? null
        : await MyGlobal.prisma.community_portal_moderators.findFirst({
            where: {
              user_id: member.id,
              community_id: communityId,
              is_active: true,
            },
          });

    const admin = await MyGlobal.prisma.community_portal_admins.findFirst({
      where: { user_id: member.id, is_active: true },
    });

    if (moderator === null && admin === null) {
      throw new HttpException("Forbidden", 403);
    }
  }

  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.community_portal_comments.update({
      where: { id: commentId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  } catch {
    throw new HttpException("Internal Server Error", 500);
  }
}
