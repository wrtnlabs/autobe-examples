import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostFavoriteCollector } from "../collectors/CommunityPlatformPostFavoriteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostFavoriteTransformer } from "../transformers/CommunityPlatformPostFavoriteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformUserPostsPostIdFavorites(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostFavorite> {
  // First, verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      user_id: true,
      community_id: true,
      created_at: true,
    } satisfies Prisma.community_platform_postsSelect,
  });
  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }
  // Check if favorite already exists (enforce unique constraint)
  const existingFavorite =
    await MyGlobal.prisma.community_platform_post_favorites.findUnique({
      where: {
        user_id_post_id: {
          user_id: props.user.id,
          post_id: props.postId,
        },
      },
    });
  // Handle existing favorite scenarios
  if (existingFavorite) {
    if (existingFavorite.deleted_at === null) {
      // Active favorite exists - cannot create duplicate
      throw new HttpException("Post already favorited by this user", 409);
    } else {
      // Favorite was soft-deleted - restore it
      const restored =
        await MyGlobal.prisma.community_platform_post_favorites.update({
          where: {
            id: existingFavorite.id,
          },
          data: {
            deleted_at: null,
            updated_at: new Date(),
          },
          ...CommunityPlatformPostFavoriteTransformer.select(),
        });
      return await CommunityPlatformPostFavoriteTransformer.transform(restored);
    }
  }
  // Prepare actor and entity references for collector
  const actorEntity: IEntity = { id: props.user.id };
  const postEntity: IEntity = { id: props.postId };
  // Create new favorite (no request body needed)
  const created =
    await MyGlobal.prisma.community_platform_post_favorites.create({
      data: await CommunityPlatformPostFavoriteCollector.collect({
        body: {} as unknown as ICommunityPlatformPostFavorite.ICreate,
        communityPlatformUsers: actorEntity,
        communityPlatformPosts: postEntity,
      }),
      ...CommunityPlatformPostFavoriteTransformer.select(),
    });
  return await CommunityPlatformPostFavoriteTransformer.transform(created);
}
