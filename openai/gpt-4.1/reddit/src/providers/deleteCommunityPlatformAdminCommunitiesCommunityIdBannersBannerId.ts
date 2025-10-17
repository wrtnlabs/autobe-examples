import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdBannersBannerId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  bannerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch banner by bannerId, communityId, not soft-deleted
  const banner =
    await MyGlobal.prisma.community_platform_community_banners.findFirst({
      where: {
        id: props.bannerId,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!banner) {
    throw new HttpException("Banner not found or already archived.", 404);
  }

  // Step 2: Soft-delete (set deleted_at to now as string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_community_banners.update({
    where: { id: props.bannerId },
    data: { deleted_at: now },
  });

  // Step 3: Optionally, could log audit/compliance here (out-of-scope, impl-ready)
}
