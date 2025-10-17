import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";

export async function getCommunityPlatformCommunitiesCommunityIdImagesImageId(props: {
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityImage> {
  const image =
    await MyGlobal.prisma.community_platform_community_images.findFirst({
      where: {
        id: props.imageId,
        community_id: props.communityId,
      },
    });

  if (!image) {
    throw new HttpException("Community image not found", 404);
  }

  return {
    id: image.id,
    community_id: image.community_id,
    file_upload_id: image.file_upload_id,
    image_type: image.image_type,
    order: image.order ?? undefined,
    alt_text: image.alt_text ?? undefined,
    active: image.active,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at: image.deleted_at
      ? toISOStringSafe(image.deleted_at)
      : undefined,
  };
}
