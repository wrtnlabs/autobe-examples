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

export async function deleteRedditPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Begin transaction for atomicity
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find the post
    const post = await tx.reddit_platform_posts.findUnique({
      where: { id: props.postId },
      select: {
        id: true,
        reddit_platform_member_id: true,
        reddit_platform_community_id: true,
        deleted_at: true,
      },
    });
    if (post === null) {
      throw new HttpException("Post not found", 404);
    }
    // Check if already deleted
    if (post.deleted_at !== null) {
      throw new HttpException("Post already deleted", 409);
    }
    // Authorization: author check
    const isAuthor = post.reddit_platform_member_id === props.member.id;
    // Authorization: community moderator check
    const isModerator =
      (await tx.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: post.reddit_platform_community_id,
          user_id: props.member.id,
        },
      })) !== null;
    if (!isAuthor && !isModerator) {
      throw new HttpException("Forbidden", 403);
    }
    // Check user not banned from community
    const ban = await tx.reddit_platform_community_bans.findFirst({
      where: {
        community_id: post.reddit_platform_community_id,
        user_id: props.member.id,
        deleted_at: null,
        expires_at: {
          gte: new Date(),
        },
      },
    });
    if (ban !== null) {
      throw new HttpException("Forbidden", 403);
    }
    // Soft delete the post
    await tx.reddit_platform_posts.update({
      where: { id: props.postId },
      data: {
        deleted_at: new Date(),
      },
    });
    return { success: true } as const;
  });
  return undefined;
}
