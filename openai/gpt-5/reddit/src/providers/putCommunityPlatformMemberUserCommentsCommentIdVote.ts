import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putCommunityPlatformMemberUserCommentsCommentIdVote(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  const { memberUser, commentId, body } = props;

  if (body.value === undefined) {
    throw new HttpException("Bad Request: Missing vote value", 400);
  }

  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: memberUser.id, deleted_at: null },
    select: { id: true },
  });
  if (!user) throw new HttpException("Unauthorized: Member not active", 403);

  const membership =
    await MyGlobal.prisma.community_platform_member_users.findFirst({
      where: { community_platform_user_id: memberUser.id, deleted_at: null },
      select: { id: true },
    });
  if (!membership)
    throw new HttpException("Unauthorized: Membership not found", 403);

  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      community_platform_user_id: true,
      community_platform_post_id: true,
      locked_at: true,
      deleted_at: true,
      post: {
        select: {
          id: true,
          locked_at: true,
          archived_at: true,
        },
      },
    },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (comment.community_platform_user_id === memberUser.id) {
    throw new HttpException(
      "Forbidden: You cannot vote on your own comment",
      403,
    );
  }

  if (comment.locked_at !== null) {
    throw new HttpException("Forbidden: Comment is locked", 403);
  }
  if (
    comment.post &&
    (comment.post.locked_at !== null || comment.post.archived_at !== null)
  ) {
    throw new HttpException("Forbidden: Post is locked or archived", 403);
  }

  const now = toISOStringSafe(new Date());

  const existing =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_user_id: memberUser.id,
        community_platform_comment_id: commentId,
      },
    });

  if (!existing) {
    const created =
      await MyGlobal.prisma.community_platform_comment_votes.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_platform_user_id: memberUser.id,
          community_platform_comment_id: commentId,
          value: body.value as -1 | 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

    return {
      id: created.id as string & tags.Format<"uuid">,
      community_platform_comment_id:
        created.community_platform_comment_id as string & tags.Format<"uuid">,
      value: created.value as -1 | 1,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  }

  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: existing.id },
      data: {
        value: body.value as -1 | 1,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    community_platform_comment_id:
      updated.community_platform_comment_id as string & tags.Format<"uuid">,
    value: updated.value as -1 | 1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
