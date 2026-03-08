import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostImageAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order: true,
        created_at: true,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_postsFindManyArgs,
        file: {
          select: {
            mime_type: true,
            file_size: true,
            width: true,
            height: true,
            versions: {
              select: {
                version_type: true,
                path: true,
              },
            } satisfies Prisma.community_platform_file_versionsFindManyArgs,
          },
        } satisfies Prisma.community_platform_filesFindManyArgs,
      },
    } satisfies Prisma.community_platform_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostImage.ISummary> {
    const getVersionPath = (versionType: string): string => {
      const version = input.file.versions.find(
        (v) => v.version_type === versionType,
      );
      return version?.path ?? "";
    };
    return {
      id: input.id,
      order: input.order,
      mime_type: input.file.mime_type,
      file_size: input.file.file_size,
      width: input.file.width ?? null,
      height: input.file.height ?? null,
      thumbnail_url: getVersionPath("thumbnail"),
      medium_url: getVersionPath("medium"),
      large_url: getVersionPath("large"),
      original_url: getVersionPath("original"),
      created_at: input.created_at.toISOString(),
    };
  }
}
