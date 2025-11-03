import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";

export async function getShoppingPlatformAnnouncementsPlatformAnnouncementId(props: {
  platformAnnouncementId: string & tags.Format<"uuid">;
}): Promise<IShoppingPlatformAnnouncement> {
  const announcement =
    await MyGlobal.prisma.shopping_platform_announcements.findUniqueOrThrow({
      where: { id: props.platformAnnouncementId },
    });
  if (announcement.deleted_at !== null) {
    throw new HttpException("Announcement not found", 404);
  }
  return {
    id: announcement.id,
    admin_id: announcement.admin_id,
    title: announcement.title,
    body: announcement.body,
    target_audience: announcement.target_audience,
    status: announcement.status,
    publish_start_at:
      announcement.publish_start_at !== null &&
      announcement.publish_start_at !== undefined
        ? toISOStringSafe(announcement.publish_start_at)
        : announcement.publish_start_at,
    publish_end_at:
      announcement.publish_end_at !== null &&
      announcement.publish_end_at !== undefined
        ? toISOStringSafe(announcement.publish_end_at)
        : announcement.publish_end_at,
    created_at: toISOStringSafe(announcement.created_at),
    updated_at: toISOStringSafe(announcement.updated_at),
    ...(announcement.deleted_at !== undefined &&
      announcement.deleted_at !== null && {
        deleted_at: toISOStringSafe(announcement.deleted_at),
      }),
  };
}
