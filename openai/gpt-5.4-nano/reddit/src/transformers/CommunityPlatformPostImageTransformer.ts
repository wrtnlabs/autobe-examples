import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostImageTransformer {
  export type Payload = Prisma.community_platform_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_post_id: true,
        file_url: true,
        content_type: true,
        file_size_bytes: true,
        image_width_px: true,
        image_height_px: true,
        alt_text: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostImage> {
    return {
      id: input.id,
      communityPlatformPostId: input.community_platform_post_id,
      fileUrl: input.file_url,
      contentType: input.content_type,
      fileSizeBytes: input.file_size_bytes,
      imageWidthPx: input.image_width_px,
      imageHeightPx: input.image_height_px,
      altText: input.alt_text,
      sortOrder: input.sort_order,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
