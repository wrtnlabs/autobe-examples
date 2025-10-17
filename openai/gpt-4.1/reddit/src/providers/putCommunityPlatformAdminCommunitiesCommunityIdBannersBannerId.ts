import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminCommunitiesCommunityIdBannersBannerId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  bannerId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanner.IUpdate;
}): Promise<ICommunityPlatformCommunityBanner> {
  // 1. Fetch the banner by id
  const original =
    await MyGlobal.prisma.community_platform_community_banners.findUnique({
      where: { id: props.bannerId },
    });
  if (!original) throw new HttpException("Banner not found", 404);

  // 2. Check ownership
  if (original.community_id !== props.communityId)
    throw new HttpException(
      "Banner does not belong to the specified community",
      404,
    );
  if (original.deleted_at !== null)
    throw new HttpException(
      "Cannot update an archived (soft-deleted) banner",
      400,
    );

  // 3. Perform DB update using only allowed fields
  const updated =
    await MyGlobal.prisma.community_platform_community_banners.update({
      where: { id: props.bannerId },
      data: {
        updated_at: toISOStringSafe(new Date()),
        ...("order" in props.body ? { order: props.body.order } : {}),
        ...("alt_text" in props.body ? { alt_text: props.body.alt_text } : {}),
        ...("active" in props.body ? { active: props.body.active } : {}),
      },
    });

  // 4. Return DTO
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
