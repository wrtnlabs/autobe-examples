import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";

export async function getCommunityPlatformPostsPostIdImagesImageId(props: {
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostImage> {
  const { postId, imageId } = props;
  const image =
    await MyGlobal.prisma.community_platform_post_images.findFirstOrThrow({
      where: {
        id: imageId,
        community_platform_post_id: postId,
      },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_file_upload_id: true,
        ordering: true,
      },
    });
  return {
    id: image.id,
    community_platform_post_id: image.community_platform_post_id,
    community_platform_file_upload_id: image.community_platform_file_upload_id,
    ordering: image.ordering,
  };
}
