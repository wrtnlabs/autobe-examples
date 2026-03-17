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

export async function deleteCommunityPlatformMemberPostsPostIdTexts(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the post exists and get its details
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
        content_type: true,
        deleted_at: true,
      },
    },
  );
  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Verify post has content_type 'TEXT'
  if (post.content_type !== "TEXT") {
    throw new HttpException("Post is not a text post", 400);
  }
  // Check authorization: either author or moderator
  const isAuthor = post.community_platform_member_id === props.member.id;
  if (!isAuthor) {
    // Check if member is moderator of the post's community
    const moderatorRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: post.community_platform_community_id,
          role_type: { in: ["owner", "moderator"] },
          deleted_at: null,
        },
      });
    if (!moderatorRole) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Check if text content exists
  const textContent =
    await MyGlobal.prisma.community_platform_post_texts.findUnique({
      where: { community_platform_post_id: props.postId },
    });
  if (!textContent) {
    throw new HttpException("Text content not found", 404);
  }
  // Check if text content is already deleted
  if (textContent.deleted_at !== null) {
    throw new HttpException("Text content not found", 404);
  }
  // Perform soft deletion
  await MyGlobal.prisma.community_platform_post_texts.update({
    where: { id: textContent.id },
    data: {
      deleted_at: new Date(),
    },
  });
}
