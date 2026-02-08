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

export async function deleteCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      author_user_id: true,
      author_moderator_id: true,
      community_id: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const isAuthor = post.author_user_id === props.user.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderatorRecord =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          community_moderator_id: props.user.id,
          role: { in: ["owner", "moderator"] },
          deleted_at: null,
        },
      });
    isModerator = moderatorRecord !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_post_texts.deleteMany({
      where: { community_platform_post_id: props.postId },
    });
    await prisma.community_platform_post_links.deleteMany({
      where: { community_platform_post_id: props.postId },
    });
    await prisma.community_platform_post_images.deleteMany({
      where: { community_platform_post_id: props.postId },
    });
    await prisma.community_platform_post_votes.deleteMany({
      where: { post_id: props.postId },
    });
    await prisma.community_platform_posts.delete({
      where: { id: props.postId },
    });
    await prisma.community_platform_moderation_logs.create({
      data: {
        id: v4(),
        moderator_id: props.user.id,
        post_id: props.postId,
        action_type: "delete_post",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  return;
}
