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

export async function deleteRedditPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify comment exists
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        reddit_platform_member_id: true,
        reddit_platform_post_id: true,
        deleted_at: true,
      },
    });
  // Verify post exists
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      community_id: true,
    },
  });
  // Check if already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 400);
  }
  // Check authorization: author OR moderator
  const isAuthor = comment.reddit_platform_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderatorAssignment =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_community_id: post.community_id,
          deleted_at: null,
        },
      });
    isModerator = moderatorAssignment !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete by setting deleted_at
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
