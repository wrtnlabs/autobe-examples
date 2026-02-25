import { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
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

export async function postCommunityPlatformUserPostsPostIdFavorite(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostFavorite.ICreate> {
  // Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check if user already has an active favorite for this post
  const existingFavorite =
    await MyGlobal.prisma.community_platform_post_favorites.findFirst({
      where: {
        user_id: props.user.id,
        post_id: props.postId,
        deleted_at: null,
      },
    });
  if (existingFavorite) {
    throw new HttpException("Post already favorited", 409);
  }
  // Create new favorite record using proper Prisma relations
  const favoriteId = v4();
  const now = new Date();
  const favorite =
    await MyGlobal.prisma.community_platform_post_favorites.create({
      data: {
        id: favoriteId,
        user: { connect: { id: props.user.id } },
        post: { connect: { id: props.postId } },
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // Return the created favorite following the ICreate DTO structure
  return {
    id: favorite.id as string & tags.Format<"uuid">,
    user_id: favorite.user_id as string & tags.Format<"uuid">,
    post_id: favorite.post_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(favorite.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(favorite.updated_at) as string &
      tags.Format<"date-time">,
  };
}
