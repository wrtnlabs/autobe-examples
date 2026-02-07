import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdImagesImageId(props: {
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostImage> {
  const image = await MyGlobal.prisma.community_platform_post_images.findUnique(
    {
      where: { id: props.imageId },
      select: {
        id: true,
        image_url: true,
        thumbnail_url: true,
        image_size: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            title: true,
            content_type: true,
            created_at: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: true,
              },
            },
            author: true,
          },
        },
      },
    },
  );
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  if (image.post.id !== props.postId) {
    throw new HttpException("Image does not belong to the specified post", 404);
  }
  return await CommunityPlatformPostImageTransformer.transform(image);
}
