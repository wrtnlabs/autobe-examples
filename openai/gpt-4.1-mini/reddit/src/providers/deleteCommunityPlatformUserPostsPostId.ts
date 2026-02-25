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
      author_user_id: true,
      community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.author_user_id !== props.user.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          user_id: props.user.id,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_post_votes.deleteMany({
      where: { post_id: props.postId },
    });
    await tx.community_platform_post_comments.deleteMany({
      where: { post_id: props.postId },
    });
    await tx.community_platform_posts.delete({ where: { id: props.postId } });
  });
}
