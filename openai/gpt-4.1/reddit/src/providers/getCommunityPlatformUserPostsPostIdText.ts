import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserPostsPostIdText(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostTexts> {
  // 1. Find the target post (must not be deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_user_id: true,
      community_platform_community_id: true,
    },
  });
  if (!post) throw new HttpException("Post not found or deleted", 404);

  // 2. If not post author, check membership in the community (must be member or post owner)
  const isAuthor = post.community_platform_user_id === props.user.id;
  if (!isAuthor) {
    const membership =
      await MyGlobal.prisma.community_platform_community_memberships.findFirst({
        where: {
          community_platform_user_id: props.user.id,
          community_platform_community_id: post.community_platform_community_id,
        },
      });
    if (!membership) {
      throw new HttpException(
        "Forbidden: You have no access to this post's community",
        403,
      );
    }
  }

  // 3. Fetch the post text entry
  const postText =
    await MyGlobal.prisma.community_platform_post_texts.findUnique({
      where: {
        community_platform_post_id: props.postId,
      },
      select: {
        id: true,
        community_platform_post_id: true,
        body: true,
      },
    });
  if (!postText) throw new HttpException("Post text not found", 404);

  return {
    id: postText.id,
    community_platform_post_id: postText.community_platform_post_id,
    body: postText.body,
  };
}
