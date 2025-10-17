import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";

export async function getCommunityPlatformCommunitiesCommunityIdBannersBannerId(props: {
  communityId: string & tags.Format<"uuid">;
  bannerId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBanner> {
  const banner =
    await MyGlobal.prisma.community_platform_community_banners.findFirst({
      where: {
        id: props.bannerId,
        community_id: props.communityId,
      },
    });
  if (!banner) {
    throw new HttpException("Banner not found", 404);
  }
  return {
    id: banner.id,
    community_id: banner.community_id,
    file_upload_id: banner.file_upload_id,
    order: banner.order ?? undefined,
    alt_text: banner.alt_text ?? undefined,
    active: banner.active,
    created_at: toISOStringSafe(banner.created_at),
    updated_at: toISOStringSafe(banner.updated_at),
    deleted_at: banner.deleted_at
      ? toISOStringSafe(banner.deleted_at)
      : undefined,
  };
}
