import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdBannersBannerId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  bannerId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanner.IUpdate;
}): Promise<ICommunityPlatformCommunityBanner> {
  const { moderator, communityId, bannerId, body } = props;

  // 1. Check moderator assignment/authorization for the community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: moderator.id,
        community_id: communityId,
        status: "active",
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Forbidden: You are not a moderator of this community",
      403,
    );
  }

  // 2. Fetch banner ensuring it belongs to the community and is not soft-deleted
  const banner =
    await MyGlobal.prisma.community_platform_community_banners.findFirst({
      where: {
        id: bannerId,
        community_id: communityId,
        deleted_at: null,
      },
    });
  if (!banner) {
    throw new HttpException(
      "Banner not found for this community or already deleted",
      404,
    );
  }

  // 3. Perform update with allowed fields only
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_banners.update({
      where: { id: bannerId },
      data: {
        order: body.order ?? undefined,
        alt_text: body.alt_text ?? undefined,
        active: body.active ?? undefined,
        updated_at: now,
      },
    });

  // 4. Return full DTO, converting dates to required types; deleted_at is nullable
  return {
    id: updated.id,
    community_id: updated.community_id,
    file_upload_id: updated.file_upload_id,
    order: updated.order ?? undefined,
    alt_text: updated.alt_text ?? undefined,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
