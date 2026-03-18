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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const actorMemberId = props.member.id;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const target = await tx.community_platform_comments.findFirst({
      where: {
        id: props.commentId,
        community_platform_post_id: props.postId,
      },
      select: {
        id: true,
        author_id: true,
        deleted_at: true,
        post: {
          select: {
            community_id: true,
          },
        },
      },
    });
    if (target === null) {
      throw new HttpException("Not Found", 404);
    }
    if (target.deleted_at !== null) {
      throw new HttpException("Already deleted", 400);
    }
    const isModerator =
      await tx.community_platform_community_moderators.findFirst({
        where: {
          community_id: target.post.community_id,
          moderator_user_id: actorMemberId,
          deleted_at: null,
        },
        select: { id: true },
      });
    const authorized =
      isModerator !== null || target.author_id === actorMemberId;
    if (!authorized) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.community_platform_comments.update({
      where: { id: target.id },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        deleted_by_id: actorMemberId,
      },
      select: { id: true },
    });
  });
}
