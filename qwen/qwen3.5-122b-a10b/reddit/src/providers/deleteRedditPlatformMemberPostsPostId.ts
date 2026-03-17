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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteRedditPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the post to verify it exists and get authorization info
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      author_id: true,
      community_id: true,
      deleted_at: true,
    },
  });
  // 2. Check if post exists and is not already deleted
  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Check authorization: author or community moderator
  const isAuthor = post.author_id === props.member.id;
  if (!isAuthor) {
    // Check if member is a moderator in the post's community
    const isModerator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_community_id: post.community_id,
          reddit_platform_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Soft delete the post (cascade will handle comments and votes)
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: { deleted_at: new Date() },
  });
}
