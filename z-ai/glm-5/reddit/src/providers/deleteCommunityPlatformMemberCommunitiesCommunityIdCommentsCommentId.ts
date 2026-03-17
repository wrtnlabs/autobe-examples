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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdCommentsCommentId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      community_platform_member_id: true,
      deleted_at: true,
      post: {
        select: {
          community_id: true,
        },
      },
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.post.community_id !== props.communityId) {
    throw new HttpException("Comment not found", 404);
  }
  const isAuthor = comment.community_platform_member_id === props.member.id;
  if (isAuthor) {
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    return;
  }
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
