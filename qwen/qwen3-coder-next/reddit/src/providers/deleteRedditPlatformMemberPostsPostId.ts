import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMessageResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMessageResponse";
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
  postId: string;
}): Promise<IRedditPlatformMessageResponse> {
  // Verify post exists and belongs to member
  const post = await MyGlobal.prisma.reddit_platform_posts.findFirst({
    where: {
      id: props.postId,
      author_id: props.member.id,
      deleted_at: null, // Only allow soft-delete for non-deleted posts
    },
  });
  if (!post) {
    throw new HttpException("Post not found or unauthorized", 404);
  }
  // Soft delete the post
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return {
    message: "Post deleted successfully",
  };
}
