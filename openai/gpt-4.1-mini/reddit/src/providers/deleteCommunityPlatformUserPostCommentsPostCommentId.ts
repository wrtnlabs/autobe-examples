import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserPostCommentsPostCommentId(props: {
  user: UserPayload;
  postCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.community_platform_post_comments.findUnique({
      where: { id: props.postCommentId },
      select: { id: true, post_id: true, user_id: true },
    });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.user_id !== props.user.id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: comment.post_id },
      select: { community_id: true },
    });
    if (post === null) {
      throw new HttpException("Post not found", 404);
    }
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          AND: [
            { community_platform_member_id: props.user.id },
            { community_id: post.community_id },
          ],
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const commentIds: string[] = [];
    async function collectNestedComments(id: string): Promise<void> {
      commentIds.push(id);
      const children = await prisma.community_platform_post_comments.findMany({
        where: { parent_comment_id: id },
        select: { id: true },
      });
      for (const child of children) {
        await collectNestedComments(child.id);
      }
    }
    await collectNestedComments(props.postCommentId);
    await prisma.community_platform_comment_vote_of_users.deleteMany({
      where: { community_platform_comment_id: { in: commentIds } },
    });
    await prisma.community_platform_comment_vote_of_moderators.deleteMany({
      where: { community_platform_comment_id: { in: commentIds } },
    });
    await prisma.community_platform_post_comments.deleteMany({
      where: { id: { in: commentIds } },
    });
  });
}
