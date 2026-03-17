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
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    },
  );
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (comment.community_platform_post_id !== post.id) {
    throw new HttpException("Not Found", 404);
  }
  if (comment.deleted_at !== null || comment.status === "removed") {
    throw new HttpException("Not Found", 404);
  }
  if (comment.community_platform_member_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: post.community_platform_community_id,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
          revoked_at: null,
        },
        select: {
          id: true,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const pendingIds: string[] = [comment.id];
    const targetIds: string[] = [];
    while (pendingIds.length !== 0) {
      const currentIds: string[] = pendingIds.splice(0, pendingIds.length);
      targetIds.push(...currentIds);
      const children = await tx.community_platform_comments.findMany({
        where: {
          parent_id: { in: currentIds },
          deleted_at: null,
          status: {
            not: "removed",
          },
        },
        select: {
          id: true,
        },
      });
      pendingIds.push(...children.map((child) => child.id));
    }
    await tx.community_platform_comments.updateMany({
      where: {
        id: { in: targetIds },
      },
      data: {
        status: "removed",
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
