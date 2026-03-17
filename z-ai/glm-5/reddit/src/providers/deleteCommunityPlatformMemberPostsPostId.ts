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

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get the post to verify ownership/community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        community_id: true,
        deleted_at: true,
      },
    },
  );
  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Authorization: is author?
  const isAuthor = post.author_id === props.member.id;
  // Authorization: is moderator/owner of the community?
  let isModerator = false;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: post.community_id,
          deleted_at: null,
        },
      });
    isModerator = moderator !== null;
  }
  // Deny if not authorized
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft deletion
  const now = new Date();
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: now,
    },
  });
  // Cascade soft delete to comments
  await MyGlobal.prisma.community_platform_comments.updateMany({
    where: { community_platform_post_id: props.postId },
    data: {
      deleted_at: now,
    },
  });
}
