import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminCommunitiesCommunityIdImagesImageId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IUpdate;
}): Promise<ICommunityPlatformCommunityImage> {
  // 1. Fetch the image, ensure it belongs to the correct community
  const found =
    await MyGlobal.prisma.community_platform_community_images.findUnique({
      where: { id: props.imageId },
    });
  if (!found || found.community_id !== props.communityId) {
    throw new HttpException(
      "Community image not found for the given community",
      404,
    );
  }
  // 2. Build update object functionally, honoring explicit null/undefined logic
  const now = toISOStringSafe(new Date());
  const updateData: Record<string, unknown> = { updated_at: now };
  if ("image_type" in props.body && props.body.image_type !== undefined) {
    updateData.image_type = props.body.image_type;
  }
  if ("order" in props.body) {
    updateData.order = props.body.order ?? null;
  }
  if ("alt_text" in props.body) {
    updateData.alt_text = props.body.alt_text ?? null;
  }
  if ("active" in props.body && props.body.active !== undefined) {
    updateData.active = props.body.active;
  }
  // 3. Update
  const updated =
    await MyGlobal.prisma.community_platform_community_images.update({
      where: { id: props.imageId },
      data: updateData,
    });
  // 4. Return normalized, strict type-safe result
  return {
    id: updated.id,
    community_id: updated.community_id,
    file_upload_id: updated.file_upload_id,
    image_type: updated.image_type,
    order: updated.order ?? null,
    alt_text: updated.alt_text ?? null,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
