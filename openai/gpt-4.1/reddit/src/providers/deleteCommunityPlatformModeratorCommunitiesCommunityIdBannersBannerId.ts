import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdBannersBannerId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  bannerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check moderator authorization for this community
  const mod = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: props.communityId,
      deleted_at: null,
      status: "active",
    },
  });
  if (!mod) {
    throw new HttpException(
      "Forbidden: Moderator is not assigned to this community or not active.",
      403,
    );
  }

  // Check that banner exists, belongs to this community, and not already deleted
  const banner =
    await MyGlobal.prisma.community_platform_community_banners.findFirst({
      where: {
        id: props.bannerId,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!banner) {
    throw new HttpException(
      "Banner not found, does not belong to this community, or already archived.",
      404,
    );
  }

  // Soft-delete by setting deleted_at
  await MyGlobal.prisma.community_platform_community_banners.update({
    where: { id: props.bannerId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
