import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostsPostIdImages(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostImage[]> {
  // Verify the post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, author_user_id: true },
    },
  );
  // Authorization: check user is the author of the post
  if (post.author_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve all active images for the post
  const images = await MyGlobal.prisma.community_platform_post_images.findMany({
    where: { community_platform_post_id: props.postId, deleted_at: null },
    ...CommunityPlatformPostImageTransformer.select(),
  });
  // Transform and return DTO array
  return await Promise.all(
    images.map(CommunityPlatformPostImageTransformer.transform),
  );
}
