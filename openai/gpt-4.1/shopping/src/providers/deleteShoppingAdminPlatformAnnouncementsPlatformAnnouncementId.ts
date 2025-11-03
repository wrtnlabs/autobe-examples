import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminPlatformAnnouncementsPlatformAnnouncementId(props: {
  admin: AdminPayload;
  platformAnnouncementId: string & tags.Format<"uuid">;
}): Promise<IShoppingPlatformAnnouncement> {
  const { platformAnnouncementId } = props;

  const existing =
    await MyGlobal.prisma.shopping_platform_announcements.findFirst({
      where: { id: platformAnnouncementId, deleted_at: null },
    });
  if (!existing) {
    throw new HttpException(
      "Platform announcement not found or already deleted",
      404,
    );
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_platform_announcements.update({
    where: { id: platformAnnouncementId },
    data: { deleted_at: now, updated_at: now },
  });

  return {
    id: updated.id,
    admin_id: updated.admin_id,
    title: updated.title,
    body: updated.body,
    target_audience: updated.target_audience,
    status: updated.status,
    publish_start_at: updated.publish_start_at
      ? toISOStringSafe(updated.publish_start_at)
      : null,
    publish_end_at: updated.publish_end_at
      ? toISOStringSafe(updated.publish_end_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: now,
  };
}
